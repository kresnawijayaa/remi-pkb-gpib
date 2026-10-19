// Uji tulis hanya pada image/database lokal sementara.
/* global fetch, FormData */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import process from "node:process";
import console from "node:console";

const base = new URL(process.env.REMI_TEST_BASE_URL ?? "http://127.0.0.1:13188");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname));
assert.ok(process.env.REMI_TEST_LOGIN_PIN && process.env.REMI_TEST_DEV_PIN && process.env.REMI_TEST_DEVELOPER_ACTION_ID);
let cookie = "";
async function action(path, id, args, fields) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(`_1_${key}`, String(value));
  body.set("0", args);
  const response = await fetch(new URL(path, base), {
    method: "POST", headers: { Accept: "text/x-component", "Next-Action": id, Origin: base.origin, ...(cookie ? { cookie } : {}) },
    body, redirect: "manual",
  });
  return { response, body: await response.text() };
}
async function page(path) {
  const response = await fetch(new URL(path, base), { headers: { cookie }, redirect: "manual" });
  assert.equal(response.status, 200);
  return response.text();
}
const html = await page("/login");
const loginId = html.match(/name="\$ACTION_ID_([a-f0-9]+)"/)?.[1];
assert.ok(loginId);
const loggedIn = await action("/login", loginId, '["$K1"]', { pin: process.env.REMI_TEST_LOGIN_PIN });
cookie = loggedIn.response.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie);
const newPage = await page("/tournaments/new");
assert.ok(newPage.includes("neo-developer-dock"));
const mutationId = newPage.match(/&quot;id&quot;:&quot;([a-f0-9]+)&quot;/)?.[1];
assert.ok(mutationId);
const eventId = randomUUID();
const eventPath = `/tournaments/${eventId}`;
const mutate = (path, fields) => action(path, mutationId, '[{},"$K1"]', { eventId, ...fields });
await mutate("/tournaments/new", { operation: "create", name: "Uji Developer", target: 2, capacity: 5, rounds: 1, advancing: 1 });
assert.equal((await page(eventPath)).includes('id="developer-tools"'), false);
const unauthorized = await mutate(eventPath, { operation: "dev-seed", version: 1 });
assert.ok(unauthorized.body.includes("Aktifkan mode developer"));
console.log("PASS: fitur tersembunyi dan aksi developer ditolak sebelum aktivasi.");

const setAccess = fields => action(eventPath, process.env.REMI_TEST_DEVELOPER_ACTION_ID, '[{},"$K1"]', fields);
const wrongPin = await setAccess({ operation: "enable", pin: "wrong-test-pin" });
assert.ok(wrongPin.body.includes("PIN developer tidak sesuai"));
assert.equal(wrongPin.response.headers.get("set-cookie"), null);
const activated = await setAccess({ operation: "enable", pin: process.env.REMI_TEST_DEV_PIN });
const devCookie = activated.response.headers.get("set-cookie");
assert.ok(devCookie?.includes("remi_developer_v1="));
assert.ok(devCookie.includes("HttpOnly") && devCookie.includes("Secure") && devCookie.includes("SameSite=lax"));
assert.ok(activated.body.includes('"enabled":true'), "Layout harus menerima status baru pada respons aktivasi.");
const adminCookie = cookie;
cookie = `${adminCookie}; ${devCookie.split(";")[0]}`;
const enabledPage = await page(eventPath);
assert.ok(enabledPage.includes('id="developer-tools"'));
assert.equal(enabledPage.includes('name="developerPin"'), false);
assert.equal(enabledPage.includes(process.env.REMI_TEST_DEV_PIN), false);
console.log("PASS: PIN benar membuka tools, cookie aman, dan PIN tidak bocor ke HTML.");

const seeded = await mutate(eventPath, { operation: "dev-seed", version: 1, count: 2, communityCount: 2, profile: "realistic", seed: 1, confirm: "yes" });
assert.ok(seeded.body.includes("2 peserta uji ditambahkan"));
await mutate(`${eventPath}/draws`, { operation: "generate", version: 2, round: 1 });
await mutate(`${eventPath}/draws`, { operation: "lock", version: 3, round: 1, confirm: "yes" });
const game = await page(`${eventPath}/game`);
assert.ok(game.includes('id="developer-tools"'));
const scored = await mutate(`${eventPath}/game`, { operation: "dev-score", version: 4, round: 1, scope: "round", profile: "normal", seed: 1, confirm: "yes" });
assert.ok(scored.body.includes("1 babak diisi skor simulasi"));
console.log("PASS: peserta uji dan skor simulasi dapat digunakan tanpa PIN berulang.");

const disabled = await setAccess({ operation: "disable" });
assert.ok(disabled.response.headers.get("set-cookie")?.includes("Max-Age=0"));
assert.ok(disabled.body.includes('"enabled":false'));
cookie = adminCookie;
const rejected = await mutate(`${eventPath}/game`, { operation: "dev-score", version: 5, round: 1 });
assert.ok(rejected.body.includes("Aktifkan mode developer"));
assert.equal((await page(`${eventPath}/game`)).includes('id="developer-tools"'), false);
console.log("PASS: menonaktifkan mode menyembunyikan tools dan menolak aksi developer berikutnya.");
