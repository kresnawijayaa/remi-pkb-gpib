import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { assertRosterEditable, normalizeCommunityName, RuleError } from "@/lib/flexible/model";
import { parseRosterFile } from "@/lib/flexible/import";
import { getEvent, saveEvent } from "@/lib/flexible/store";

export async function POST(request: Request, { params }: { params: Promise<{ tournamentId: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Sesi berakhir. Masuk kembali." }, { status: 401 });
  try {
    const { tournamentId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new RuleError("Pilih file peserta terlebih dahulu.");
    const rows = await parseRosterFile(file);
    const event = await getEvent(tournamentId);
    if (!event) throw new RuleError("Turnamen tidak ditemukan.");
    assertRosterEditable(event.data);
    if (event.version !== Number(form.get("version"))) throw new RuleError("Data berubah. Muat ulang halaman sebelum mengimpor.");
    const existing = new Set(event.data.participants.map(person => `${person.name.toLocaleLowerCase("id-ID")}|${event.data.communities.find(item => item.id === person.communityId)?.normalizedName ?? ""}`));
    const accepted = rows.filter(row => !existing.has(`${row.name.toLocaleLowerCase("id-ID")}|${normalizeCommunityName(row.community)}`));
    const mode = String(form.get("mode"));
    const newCommunities = [...new Set(accepted.map(row => normalizeCommunityName(row.community)))].filter(name => !event.data.communities.some(item => item.normalizedName === name));
    if (mode === "preview") return NextResponse.json({ rows: accepted.slice(0, 20), total: rows.length, accepted: accepted.length, duplicates: rows.length - accepted.length, newCommunities: newCommunities.length });
    if (mode !== "import") throw new RuleError("Mode impor tidak valid.");
    if (event.data.participants.length + accepted.length > event.data.settings.target) throw new RuleError(`Impor melebihi target ${event.data.settings.target} peserta. Tersedia ${event.data.settings.target - event.data.participants.length} tempat.`);
    for (const row of accepted) {
      const normalizedName = normalizeCommunityName(row.community);
      let community = event.data.communities.find(item => item.normalizedName === normalizedName);
      if (!community) { community = { id: randomUUID(), name: row.community, normalizedName }; event.data.communities.push(community); }
      event.data.participants.push({ id: randomUUID(), number: Math.max(0, ...event.data.participants.map(item => item.number)) + 1, name: row.name, communityId: community.id });
    }
    event.data.draws = [];
    event.data.audit.push({ at: new Date().toISOString(), action: `import: ${accepted.length} peserta dan ${newCommunities.length} komunitas baru ditambahkan.` });
    await saveEvent(event);
    return NextResponse.json({ message: `${accepted.length} peserta diimpor. ${rows.length - accepted.length} duplikat dilewati.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof RuleError ? error.message : "File belum berhasil diproses." }, { status: 400 });
  }
}
