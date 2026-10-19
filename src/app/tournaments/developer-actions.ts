"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { authCookieName, isAuthenticated } from "@/lib/auth";
import { createDeveloperSession, developerCookieName, developerSessionSeconds } from "@/lib/developer-session";

export type DeveloperActionState = { error?: string };

export async function setDeveloperAccess(_previous: DeveloperActionState, form: FormData): Promise<DeveloperActionState> {
  if (!(await isAuthenticated())) return { error: "Sesi panitia berakhir. Masuk kembali terlebih dahulu." };
  const cookieStore = await cookies();
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  if (form.get("operation") === "disable") {
    cookieStore.set(developerCookieName, "", { ...options, maxAge: 0 });
  } else {
    const pin = process.env.REMI_DEV_PIN?.trim();
    const secret = process.env.REMI_SESSION_SECRET ?? "";
    if (!pin) return { error: "PIN developer belum disiapkan oleh pengelola aplikasi." };
    if (secret.length < 32) return { error: "Konfigurasi sesi belum lengkap. Hubungi pengelola aplikasi." };
    const supplied = Buffer.from(String(form.get("pin") ?? "").trim());
    const expected = Buffer.from(pin);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return { error: "PIN developer tidak sesuai." };
    const adminSession = cookieStore.get(authCookieName)?.value ?? "development-without-auth";
    cookieStore.set(developerCookieName, createDeveloperSession(adminSession, pin, secret), { ...options, maxAge: developerSessionSeconds });
  }
  revalidatePath("/tournaments", "layout");
  return {};
}
