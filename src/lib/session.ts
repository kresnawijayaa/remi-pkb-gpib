export const authCookieName = "remi_session_v2";

export function isAuthEnabled() {
  return process.env.NODE_ENV === "production" || process.env.REMI_AUTH_ENABLED !== "false";
}

async function sessionKey() {
  const secret = process.env.REMI_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("REMI_SESSION_SECRET harus minimal 32 karakter.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function createSession() {
  const payload = `${Math.floor(Date.now() / 1000) + 43200}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign("HMAC", await sessionKey(), new TextEncoder().encode(payload));
  return `${payload}.${Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function verifySession(token?: string) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || !/^[a-f0-9]{64}$/.test(parts[2])) return false;
  const expires = Number(parts[0]);
  if (expires <= Date.now() / 1000 || expires > Date.now() / 1000 + 43260) return false;
  try {
    const signature = Uint8Array.from(parts[2].match(/../g)!, byte => parseInt(byte, 16));
    return await crypto.subtle.verify("HMAC", await sessionKey(), signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  } catch {
    return false;
  }
}
