"use server";

import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth";
import { assertRosterEditable, assertScoreEditable, generateDraw, generateSeededDraw, normalizeCommunityName, RuleError, settingsSchema, swapDraw, unlockDraw, validateDraw } from "@/lib/flexible/model";
import { createEvent, getEvent, saveEvent } from "@/lib/flexible/store";
import { buildDistribution, buildNames, randomFrom } from "@/lib/flexible/dev-seed";
import { calculateStandings, rankTable, scoringComplete } from "@/lib/flexible/scoring";

export type ActionState = { error?: string; message?: string; redirectTo?: string; nonce?: string };

export async function mutateEvent(_previous: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isAuthenticated())) return { error: "Sesi berakhir. Masuk kembali sebelum menyimpan." };
  try {
    const operation = String(form.get("operation"));
    const id = z.string().uuid().parse(form.get("eventId"));
    if (operation === "create") {
      const settings = settingsSchema.parse(Object.fromEntries(form));
      await createEvent(id, { dataVersion: 2, settings, communities: [], participants: [], draws: [], results: [], qualifiedIds: [], qualificationLockedAt: null, parentId: null, audit: [{ at: new Date().toISOString(), action: "Turnamen dibuat" }] });
      revalidatePath("/tournaments");
      return { redirectTo: `/tournaments/${id}` };
    }
    const event = await getEvent(id);
    if (!event) throw new RuleError("Turnamen tidak ditemukan.");
    if (event.version !== Number(form.get("version"))) throw new RuleError("Data berubah di perangkat lain. Muat ulang sebelum menyimpan.");
    const data = event.data;
    const number = Number(form.get("round"));
    let message = "Perubahan tersimpan.";
    if (operation === "settings") {
      const settings = settingsSchema.parse(Object.fromEntries(form));
      if (data.results.length || data.qualificationLockedAt) throw new RuleError("Pengaturan pertandingan tidak dapat diubah setelah skor mulai masuk.");
      if (settings.target < data.participants.length) throw new RuleError("Target tidak boleh kurang dari peserta yang sudah terdaftar.");
      const structureChanged = settings.target !== data.settings.target || settings.capacity !== data.settings.capacity;
      if (structureChanged) assertRosterEditable(data);
      if (data.draws.some(draw => draw.locked && draw.number > settings.rounds)) throw new RuleError("Buka kunci babak yang akan dibatalkan terlebih dahulu.");
      if ((structureChanged && data.draws.length > 0) || settings.rounds < data.settings.rounds) {
        if (form.get("confirm") !== "yes") throw new RuleError("Centang persetujuan perubahan jadwal.");
      }
      data.draws = structureChanged ? [] : data.draws.filter(draw => draw.number <= settings.rounds);
      data.settings = settings;
      message = "Pengaturan diperbarui. Pembagian terkunci yang dipertahankan tidak berubah.";
    } else if (operation === "participant") {
      assertRosterEditable(data);
      const person = z.object({ name: z.string().trim().min(2).max(100), communityId: z.string().min(1).nullable() }).parse({ name: form.get("name"), communityId: form.get("communityId") || null });
      if (person.communityId && !data.communities.some(item => item.id === person.communityId)) throw new RuleError("Komunitas / sektor tidak ditemukan.");
      if (data.participants.length >= data.settings.target) throw new RuleError("Target peserta sudah terpenuhi. Ubah target sebelum menambah peserta.");
      data.participants.push({ ...person, id: randomUUID(), number: Math.max(0, ...data.participants.map(item => item.number)) + 1 });
      data.draws = [];
      message = "Peserta ditambahkan. Draft pembagian lama dibersihkan.";
    } else if (operation === "community-create") {
      const name = z.string().trim().min(2).max(80).parse(form.get("name"));
      const normalizedName = normalizeCommunityName(name);
      if (data.communities.some(item => item.normalizedName === normalizedName)) throw new RuleError("Komunitas / sektor tersebut sudah terdaftar.");
      data.communities.push({ id: randomUUID(), name, normalizedName });
      message = `${name} ditambahkan ke daftar komunitas / sektor.`;
    } else if (operation === "community-update") {
      const community = data.communities.find(item => item.id === form.get("communityId"));
      if (!community) throw new RuleError("Komunitas / sektor tidak ditemukan.");
      const name = z.string().trim().min(2).max(80).parse(form.get("name"));
      const normalizedName = normalizeCommunityName(name);
      if (data.communities.some(item => item.id !== community.id && item.normalizedName === normalizedName)) throw new RuleError("Nama tersebut sudah dipakai komunitas / sektor lain.");
      community.name = name;
      community.normalizedName = normalizedName;
      message = "Nama komunitas / sektor diperbarui.";
    } else if (operation === "community-delete") {
      const communityId = String(form.get("communityId"));
      if (data.participants.some(person => person.communityId === communityId)) throw new RuleError("Komunitas masih dipakai peserta. Pindahkan pesertanya terlebih dahulu.");
      data.communities = data.communities.filter(item => item.id !== communityId);
      message = "Komunitas / sektor dihapus.";
    } else if (operation === "community-merge") {
      const sourceId = String(form.get("communityId"));
      const targetId = String(form.get("targetCommunityId"));
      if (sourceId === targetId || !data.communities.some(item => item.id === targetId)) throw new RuleError("Pilih komunitas tujuan yang berbeda.");
      data.participants.forEach(person => { if (person.communityId === sourceId) person.communityId = targetId; });
      data.communities = data.communities.filter(item => item.id !== sourceId);
      message = "Komunitas digabung dan peserta dipindahkan.";
    } else if (operation === "remove") {
      assertRosterEditable(data);
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan penghapusan peserta.");
      data.participants = data.participants.filter(person => person.id !== form.get("personId"));
      data.draws = [];
      message = "Peserta dihapus; nomor peserta lain tidak berubah.";
    } else if (operation === "dev-seed") {
      assertRosterEditable(data);
      if (process.env.REMI_DEV_TOOLS_ENABLED !== "true" || !process.env.REMI_DEV_PIN) throw new RuleError("Developer tools tidak aktif.");
      const supplied = Buffer.from(String(form.get("developerPin")));
      const expected = Buffer.from(process.env.REMI_DEV_PIN);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new RuleError("PIN developer salah.");
      const input = z.object({ count: z.coerce.number().int().min(1).max(500), communityCount: z.coerce.number().int().min(2).max(30), profile: z.enum(["realistic", "extreme", "random"]), seed: z.coerce.number().int().min(0) }).parse(Object.fromEntries(form));
      if (data.participants.length + input.count > data.settings.target) throw new RuleError("Jumlah data uji melebihi sisa target peserta.");
      const distribution = buildDistribution(input.count, input.communityCount, input.profile, input.seed);
      const names = buildNames(input.count, input.seed);
      const communities = distribution.map((_, index) => {
        const name = `Sektor Uji ${index + 1}`;
        const normalizedName = normalizeCommunityName(name);
        let community = data.communities.find(item => item.normalizedName === normalizedName);
        if (!community) { community = { id: randomUUID(), name, normalizedName }; data.communities.push(community); }
        return community;
      });
      let nameIndex = 0;
      let nextNumber = Math.max(0, ...data.participants.map(item => item.number)) + 1;
      distribution.forEach((count, index) => { for (let item = 0; item < count; item++) data.participants.push({ id: randomUUID(), number: nextNumber++, name: names[nameIndex++], communityId: communities[index].id }); });
      data.draws = [];
      message = `${input.count} peserta uji ditambahkan dengan distribusi ${input.profile}.`;
    } else if (operation === "dev-score") {
      assertScoreEditable(data);
      if (process.env.REMI_DEV_TOOLS_ENABLED !== "true" || !process.env.REMI_DEV_PIN) throw new RuleError("Developer tools tidak aktif.");
      const supplied = Buffer.from(String(form.get("developerPin")));
      const expected = Buffer.from(process.env.REMI_DEV_PIN);
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new RuleError("PIN developer salah.");
      const input = z.object({ scope: z.enum(["round", "all"]), profile: z.enum(["normal", "ties"]), seed: z.coerce.number().int().min(0) }).parse(Object.fromEntries(form));
      const selectedDraws = data.draws.filter(draw => draw.locked && (input.scope === "all" || draw.number === number));
      if (!selectedDraws.length) throw new RuleError("Tidak ada pembagian terkunci untuk diisi.");
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan pengisian skor simulasi.");
      const selectedRounds = new Set(selectedDraws.map(draw => draw.number));
      data.results = data.results.filter(result => !selectedRounds.has(result.round));
      const random = randomFrom(input.seed);
      for (const draw of selectedDraws) for (let tableIndex = 0; tableIndex < draw.tables.length; tableIndex++) {
        const participantIds = draw.tables[tableIndex];
        const order = [...participantIds].sort(() => random() - 0.5);
        const generated = order.map((participantId, index) => ({ participantId, score: input.profile === "ties" && index < 2 ? 500 : Math.round(900 - index * 110 + random() * 70), manualRank: index + 1 }));
        data.results.push({ round: draw.number, table: tableIndex + 1, submittedAt: new Date().toISOString(), scores: rankTable(generated) });
      }
      message = `${selectedDraws.length} babak diisi skor simulasi untuk ${selectedDraws.reduce((sum, draw) => sum + draw.tables.flat().length, 0)} posisi peserta.`;
    } else if (operation === "generate") {
      const draw = generateDraw(data, number);
      data.draws = [...data.draws.filter(item => item.number !== number), draw].sort((first, second) => first.number - second.number);
      message = `Draft babak ${number} siap. Periksa sebelum dikunci.`;
    } else if (operation === "generate-seeded") {
      const draw = generateSeededDraw(data, number);
      data.draws = [...data.draws.filter(item => item.number !== number), draw].sort((first, second) => first.number - second.number);
      message = `Draft adil babak ${number} siap berdasarkan peringkat awal peserta.`;
    } else if (operation === "swap") {
      swapDraw(data, number, String(form.get("first")), String(form.get("second")));
      message = "Peserta ditukar. Periksa peringatan rotasi sebelum mengunci.";
    } else if (operation === "lock") {
      const draw = data.draws.find(item => item.number === number);
      if (!draw) throw new RuleError("Generate pembagian terlebih dahulu.");
      if (data.participants.length !== data.settings.target) throw new RuleError("Jumlah peserta belum sesuai target.");
      if (data.draws.filter(item => item.number < number && item.locked).length !== number - 1) throw new RuleError("Kunci babak sebelumnya terlebih dahulu.");
      validateDraw(data, draw);
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan bahwa pembagian sudah diperiksa.");
      draw.locked = true;
      message = `Pembagian babak ${number} dikunci. Skor belum diperlukan.`;
    } else if (operation === "unlock") {
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan penarikan pembagian dari link publik.");
      unlockDraw(data, number);
      message = "Kunci dibuka. Babak ini ditarik dari link publik; draft berikutnya dibersihkan.";
    } else if (operation === "score-table") {
      assertScoreEditable(data);
      const table = Number(form.get("table"));
      const draw = data.draws.find(item => item.number === number && item.locked);
      const participantIds = draw?.tables[table - 1];
      if (!draw || !participantIds) throw new RuleError("Pembagian meja terkunci tidak ditemukan.");
      const input = participantIds.map(participantId => ({ participantId, score: z.coerce.number().int().min(-999999).max(999999).parse(form.get(`score-${participantId}`)), manualRank: form.get(`rank-${participantId}`) ? z.coerce.number().int().min(1).max(participantIds.length).parse(form.get(`rank-${participantId}`)) : null }));
      const scores = rankTable(input);
      data.results = [...data.results.filter(result => result.round !== number || result.table !== table), { round: number, table, scores, submittedAt: new Date().toISOString() }];
      message = `Skor babak ${number}, meja ${table} disimpan.`;
    } else if (operation === "score-clear") {
      assertScoreEditable(data);
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan penghapusan skor meja.");
      const table = Number(form.get("table"));
      data.results = data.results.filter(result => result.round !== number || result.table !== table);
      message = `Skor babak ${number}, meja ${table} dihapus.`;
    } else if (operation === "qualification-lock") {
      if (!scoringComplete(data)) throw new RuleError("Lengkapi skor seluruh meja dan babak sebelum mengunci kelolosan.");
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan daftar peserta yang lolos.");
      data.qualifiedIds = calculateStandings(data).slice(0, data.settings.advancing).map(row => row.participantId);
      data.qualificationLockedAt = new Date().toISOString();
      message = `${data.qualifiedIds.length} peserta teratas dikunci sebagai peserta lolos.`;
    } else if (operation === "qualification-unlock") {
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan pembukaan kelolosan.");
      data.qualifiedIds = [];
      data.qualificationLockedAt = null;
      message = "Kelolosan dibuka kembali. Skor dapat dikoreksi.";
    } else if (operation === "create-stage") {
      if (!data.qualificationLockedAt || data.qualifiedIds.length !== data.settings.advancing) throw new RuleError("Kunci peserta lolos terlebih dahulu.");
      const nextSettings = settingsSchema.parse({ ...Object.fromEntries(form), target: data.qualifiedIds.length });
      const nextId = randomUUID();
      const participants = data.qualifiedIds.map((participantId, index) => { const person = data.participants.find(item => item.id === participantId); if (!person) throw new RuleError("Peserta lolos tidak ditemukan."); return { ...person, id: randomUUID(), number: index + 1 }; });
      const usedCommunityIds = new Set(participants.map(person => person.communityId).filter(Boolean));
      await createEvent(nextId, { dataVersion: 2, settings: nextSettings, communities: data.communities.filter(item => usedCommunityIds.has(item.id)), participants, draws: [], results: [], qualifiedIds: [], qualificationLockedAt: null, parentId: event.id, audit: [{ at: new Date().toISOString(), action: `Tahap dibuat dari ${data.settings.name}` }] });
      data.audit.push({ at: new Date().toISOString(), action: `create-stage: tahap lanjutan ${nextSettings.name} dibuat.` });
      await saveEvent(event);
      revalidatePath("/tournaments");
      return { redirectTo: `/tournaments/${nextId}` };
    } else if (operation === "share") {
      if (!data.draws.some(draw => draw.locked)) throw new RuleError("Kunci minimal satu babak sebelum membagikan.");
      if (event.shareToken && form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan penggantian link; link lama akan berhenti berlaku.");
      event.shareToken = randomBytes(24).toString("hex");
      message = "Link pembagian siap. Hanya babak terkunci yang ditampilkan.";
    } else if (operation === "revoke") {
      if (form.get("confirm") !== "yes") throw new RuleError("Konfirmasikan pencabutan link publik.");
      event.shareToken = null;
      message = "Link publik dicabut.";
    } else throw new RuleError("Aksi tidak dikenal.");
    data.audit.push({ at: new Date().toISOString(), action: `${operation}${Number.isFinite(number) && number > 0 ? ` · babak ${number}` : ""}: ${message}` });
    await saveEvent(event);
    revalidatePath("/tournaments");
    revalidatePath(`/tournaments/${id}`);
    revalidatePath(`/tournaments/${id}/draws`);
    revalidatePath(`/tournaments/${id}/game`);
    revalidatePath(`/tournaments/${id}/standings`);
    return { message, nonce: randomUUID() };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(" · ") };
    if (error instanceof RuleError) return { error: error.message };
    return { error: "Belum berhasil menyimpan. Input tetap tersedia. Periksa koneksi atau migrasi database, lalu muat ulang sebelum mencoba lagi." };
  }
}
