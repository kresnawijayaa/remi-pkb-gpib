import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const authCookieName = "remi_pkb_auth";
export const authCookieValue = "allowed";

export function isAuthEnabled() {
  return process.env.REMI_AUTH_ENABLED !== "false";
}

export async function isAuthenticated() {
  if (!isAuthEnabled()) return true;

  const cookieStore = await cookies();
  return cookieStore.get(authCookieName)?.value === authCookieValue;
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}
