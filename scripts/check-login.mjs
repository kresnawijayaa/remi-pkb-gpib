// Regression check untuk image production lokal. Jangan gunakan PIN production.
/* global fetch, FormData */
import assert from "node:assert/strict";
import { URL } from "node:url";
import process from "node:process";
import console from "node:console";

const base = new URL(process.env.REMI_TEST_BASE_URL ?? "http://127.0.0.1:13186");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "Uji ini hanya untuk aplikasi lokal.");
const pin = process.env.REMI_TEST_LOGIN_PIN;
assert.ok(pin, "Isi REMI_TEST_LOGIN_PIN dengan PIN container test lokal.");

const loginPage = await fetch(new URL("/login", base), { redirect: "manual" });
assert.equal(loginPage.status, 200);
const html = await loginPage.text();
const actionId = html.match(/name="\$ACTION_ID_([a-f0-9]+)"/)?.[1];
assert.ok(actionId, "Form login harus memiliki Server Action.");

async function submitPin(value, forwarded = false) {
  // Encoding argumen FormData React Server Action pada versi Next.js proyek ini.
  const body = new FormData();
  body.set("_1_pin", value);
  body.set("0", '["$K1"]');
  return fetch(new URL("/login", base), {
    method: "POST",
    headers: {
      Accept: "text/x-component",
      "Next-Action": actionId,
      Origin: forwarded ? "https://remi.test" : base.origin,
      ...(forwarded ? { "X-Forwarded-Host": "remi.test", "X-Forwarded-Proto": "https" } : {}),
    },
    body,
    redirect: "manual",
  });
}

for (const forwarded of [false, true]) {
  const response = await submitPin(pin, forwarded);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("x-action-redirect"), "/tournaments;push");
  assert.ok(response.headers.get("content-type")?.startsWith("text/x-component"));
  // Header Location tambahan membuat fetch mengikuti redirect dan kehilangan RSC.
  assert.equal(response.headers.get("location"), null);
  const session = response.headers.get("set-cookie");
  assert.ok(session?.includes("HttpOnly"));
  assert.ok(session.includes("Secure"));
  assert.ok(session.includes("SameSite=lax"));
  await response.arrayBuffer();

  const cookie = session.split(";")[0];
  const dashboard = await fetch(new URL("/tournaments", base), { headers: { cookie }, redirect: "manual" });
  assert.equal(dashboard.status, 200);
  await dashboard.arrayBuffer();
  const authenticatedLogin = await fetch(new URL("/login", base), { headers: { cookie }, redirect: "manual" });
  assert.equal(authenticatedLogin.status, 307);
  assert.equal(new URL(authenticatedLogin.headers.get("location"), base).pathname, "/tournaments");
  await authenticatedLogin.arrayBuffer();
  console.log(`PASS: login ${forwarded ? "dengan header proxy HTTPS" : "langsung"}, sesi, dan redirect langsung ke dashboard.`);
}

const wrongPin = await submitPin("invalid-test-pin");
assert.equal(wrongPin.headers.get("x-action-redirect"), "/login?error=pin;push");
assert.equal(wrongPin.headers.get("set-cookie"), null);
await wrongPin.arrayBuffer();
console.log("PASS: PIN salah ditolak tanpa membuat sesi.");
