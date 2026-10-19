// Uji integrasi dengan image dan database lokal khusus pengujian.
/* global fetch, FormData */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import process from "node:process";
import console from "node:console";

const base = new URL(process.env.REMI_TEST_BASE_URL ?? "http://127.0.0.1:13187");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Uji tulis hanya untuk server lokal.");
assert.ok(process.env.REMI_TEST_LOGIN_PIN, "Isi REMI_TEST_LOGIN_PIN container lokal.");

const loginHtml = await (await fetch(new URL("/login", base))).text();
const loginId = loginHtml.match(/name="\$ACTION_ID_([a-f0-9]+)"/)?.[1];
assert.ok(loginId);
const loginBody = new FormData();
loginBody.set("_1_pin", process.env.REMI_TEST_LOGIN_PIN);
loginBody.set("0", '["$K1"]');
const login = await fetch(new URL("/login", base), {
  method: "POST", headers: { Accept: "text/x-component", "Next-Action": loginId, Origin: base.origin },
  body: loginBody, redirect: "manual",
});
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Login test harus berhasil.");
await login.arrayBuffer();

const newPage = await (await fetch(new URL("/tournaments/new", base), { headers: { cookie } })).text();
const mutationId = newPage.match(/&quot;id&quot;:&quot;([a-f0-9]+)&quot;/)?.[1];
assert.ok(mutationId, "Server Action form turnamen harus ditemukan.");
const eventId = randomUUID();

async function mutate(path, fields) {
  const body = new FormData();
  for (const [key, value] of Object.entries({ eventId, ...fields })) body.set(`_1_${key}`, String(value));
  body.set("0", '[{},"$K1"]');
  const response = await fetch(new URL(path, base), {
    method: "POST",
    headers: { cookie, Accept: "text/x-component", "Next-Action": mutationId, Origin: base.origin },
    body, redirect: "manual",
  });
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type")?.startsWith("text/x-component"));
  return response.text();
}

const created = await mutate("/tournaments/new", { operation: "create", name: "Uji Refresh Tunggal", target: 2, capacity: 5, rounds: 1, advancing: 1 });
assert.ok(created.includes(`/tournaments/${eventId}`));
const communitiesPath = `/tournaments/${eventId}/communities`;
const first = await mutate(communitiesPath, { operation: "community-create", version: 1, name: "Komunitas Pertama" });
assert.ok(first.includes('"version":2'), "Respons POST harus membawa versi baru tanpa GET tambahan.");
assert.ok(first.includes("Komunitas Pertama"));
const second = await mutate(communitiesPath, { operation: "community-create", version: 2, name: "Komunitas Kedua" });
assert.ok(second.includes('"version":3'));
assert.ok(second.includes("Komunitas Pertama") && second.includes("Komunitas Kedua"));
console.log("PASS: dua penyimpanan komunitas berurutan membawa data dan versi terbaru pada respons POST yang sama.");

const stale = await mutate(communitiesPath, { operation: "community-create", version: 1, name: "Versi Usang" });
assert.ok(stale.includes("Data berubah di perangkat lain"));
console.log("PASS: perubahan dengan versi usang tetap ditolak.");

const participant = await mutate(`/tournaments/${eventId}`, { operation: "participant", version: 3, name: "Peserta Uji" });
assert.ok(participant.includes('"version":4'));
assert.ok(participant.includes("Peserta Uji"));
console.log("PASS: tambah peserta juga mengembalikan daftar dan versi terbaru tanpa refresh klien tambahan.");
