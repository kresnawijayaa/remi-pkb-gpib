import { cookies } from "next/headers";
import { authCookieName, isAuthenticated } from "./auth";
import { developerCookieName, verifyDeveloperSession } from "./developer-session";
import { RuleError } from "./flexible/model";

export async function getDeveloperAccess() {
  const pin = process.env.REMI_DEV_PIN?.trim() ?? "";
  const configured = Boolean(pin);
  if (!configured || !(await isAuthenticated())) return { configured, enabled: false };
  const cookieStore = await cookies();
  const adminSession = cookieStore.get(authCookieName)?.value ?? "development-without-auth";
  const enabled = verifyDeveloperSession(cookieStore.get(developerCookieName)?.value, adminSession, pin, process.env.REMI_SESSION_SECRET ?? "");
  return { configured, enabled };
}

export async function requireDeveloperAccess() {
  if (!(await getDeveloperAccess()).enabled) throw new RuleError("Aktifkan mode developer melalui tombol di pojok kanan bawah. Sesi developer mungkin sudah berakhir.");
}
