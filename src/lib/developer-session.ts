import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const developerCookieName = "remi_developer_v1";
export const developerSessionSeconds = 60 * 60;

function signature(payload: string, adminSession: string, pin: string, secret: string) {
  return createHmac("sha256", secret).update(JSON.stringify(["remi-developer-v1", payload, adminSession, pin])).digest("hex");
}

export function createDeveloperSession(adminSession: string, pin: string, secret: string, now = Date.now()) {
  const payload = `${Math.floor(now / 1000) + developerSessionSeconds}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${signature(payload, adminSession, pin, secret)}`;
}

export function verifyDeveloperSession(token: string | undefined, adminSession: string, pin: string, secret: string, now = Date.now()) {
  if (!token || !pin || secret.length < 32) return false;
  const [expires, nonce, supplied, ...extra] = token.split(".");
  if (extra.length || !/^\d+$/.test(expires ?? "") || !/^[a-f0-9]{32}$/.test(nonce ?? "") || !/^[a-f0-9]{64}$/.test(supplied ?? "")) return false;
  const remaining = Number(expires) - Math.floor(now / 1000);
  if (remaining <= 0 || remaining > developerSessionSeconds) return false;
  const expected = signature(`${expires}.${nonce}`, adminSession, pin, secret);
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"));
}
