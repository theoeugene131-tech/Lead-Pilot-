import { NextRequest, NextResponse } from "next/server";

const COOKIE = "leadpilot_session";
const encoder = new TextEncoder();

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function validSession(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    if (!payload || typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return false;
    if (typeof payload.email !== "string") return false;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("HMAC", key, decodeBase64Url(parts[1]), encoder.encode(parts[0]));
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path === "/" || path === "/login" || path === "/api/auth/login" || path === "/api/auth/logout" ||
      path === "/auth/callback" || path.startsWith("/_next/") || path === "/favicon.ico") return NextResponse.next();

  const secret = process.env.LEADPILOT_SESSION_SECRET;
  if (!secret) {
    return path.startsWith("/api/")
      ? NextResponse.json({ error: "Owner login is not configured. Set LEADPILOT_SESSION_SECRET in Vercel." }, { status: 503 })
      : new NextResponse("Owner login is not configured. Set LEADPILOT_SESSION_SECRET in Vercel.", { status: 503 });
  }

  const token = req.cookies.get(COOKIE)?.value || "";
  if (await validSession(token, secret)) return NextResponse.next();

  if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", path);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
};
