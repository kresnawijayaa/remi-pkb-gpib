import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const authCookieName = "remi_pkb_auth";
export const authCookieValue = "allowed";

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(authCookieName)?.value === authCookieValue;
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}
