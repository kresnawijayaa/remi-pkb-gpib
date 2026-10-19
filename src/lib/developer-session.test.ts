import assert from "node:assert/strict";
import test from "node:test";
import { createDeveloperSession, verifyDeveloperSession, developerSessionSeconds } from "./developer-session";

const secret = "developer-test-secret-".repeat(3);
const now = Date.UTC(2026, 9, 19, 4);

test("sesi developer terikat ke sesi admin dan PIN yang berlaku", () => {
  const token = createDeveloperSession("admin-session-a", "test-pin", secret, now);
  assert.ok(verifyDeveloperSession(token, "admin-session-a", "test-pin", secret, now));
  assert.equal(verifyDeveloperSession(token, "admin-session-b", "test-pin", secret, now), false);
  assert.equal(verifyDeveloperSession(token, "admin-session-a", "new-pin", secret, now), false);
  assert.equal(verifyDeveloperSession(token, "admin-session-a", "test-pin", "different-secret".repeat(3), now), false);
});

test("sesi developer menolak token diubah, kosong, dan kedaluwarsa", () => {
  const token = createDeveloperSession("admin-session", "test-pin", secret, now);
  const altered = `${token.slice(0, -1)}${token.endsWith("0") ? "1" : "0"}`;
  assert.equal(verifyDeveloperSession(altered, "admin-session", "test-pin", secret, now), false);
  assert.equal(verifyDeveloperSession(undefined, "admin-session", "test-pin", secret, now), false);
  assert.equal(verifyDeveloperSession(token, "admin-session", "test-pin", secret, now + developerSessionSeconds * 1000), false);
});
