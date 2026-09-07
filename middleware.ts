import { NextResponse, type NextRequest } from "next/server";

const authCookieName = "remi_pkb_auth";
const authCookieValue = "allowed";

function isAuthEnabled() {
  return process.env.REMI_AUTH_ENABLED !== "false";
}

export function middleware(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthenticated = request.cookies.get(authCookieName)?.value === authCookieValue;

  if (!isAuthenticated && !isLoginPage) {
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
