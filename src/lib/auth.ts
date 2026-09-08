import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authCookieName, isAuthEnabled, verifySession } from "@/lib/session";
export { authCookieName, isAuthEnabled } from "@/lib/session";

export async function isAuthenticated() {
  if (!isAuthEnabled()) return true;

  const cookieStore = await cookies();
  return verifySession(cookieStore.get(authCookieName)?.value);
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function requireLegacyWrite(): Promise<void> {
  await requireAuth();
  throw new Error("Arsip baca-saja. Buat turnamen baru di /tournaments.");
}
