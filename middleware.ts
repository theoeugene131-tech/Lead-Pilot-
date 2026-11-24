import { NextRequest, NextResponse } from "next/server";
import { OWNER_SESSION_COOKIE, verifyOwnerSession } from "./lib/server/owner-session";

const PUBLIC_PATHS = new Set([
  "/", "/login", "/api/auth/login",
  "/api/auth/logout", "/auth/callback",
]);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    PUBLIC_PATHS.has(path) ||
    path.startsWith("/_next/") ||
    path === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$/.test(path)
  ) return NextResponse.next();

  const token = request.cookies.get(OWNER_SESSION_COOKIE)?.value;
  if (await verifyOwnerSession(token)) return NextResponse.next();

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Your owner session has expired. Please sign in again." }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", path);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
