import { NextResponse, type NextRequest } from "next/server";

import { authCookieName, isAuthEnabled, verifySession } from "./src/lib/session";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/share/")) return NextResponse.next();
  if (!isAuthEnabled()) return NextResponse.next();

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthenticated = await verifySession(request.cookies.get(authCookieName)?.value);

  if (!isAuthenticated && !isLoginPage) {
    if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
