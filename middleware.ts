import { NextRequest, NextResponse } from "next/server";

const COOKIE = "leadpilot_session";
const encoder = new TextEncoder();

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function fromBase64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function validSession(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64url(parts[0])));
    if (!payload || typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return false;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("HMAC", key, fromBase64url(parts[1]), encoder.encode(parts[0]));
  } catch { return false; }
}

export async function middleware(req: NextRequest) {
  const password = process.env.LEADPILOT_ACCESS_PASSWORD;
  const secret = process.env.LEADPILOT_SESSION_SECRET;
  // Keep existing deployments reachable until the owner configures both secrets.
  // Once configured, every page and API route is protected by the signed session.
  if (!password || !secret) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (path === "/login" || path === "/api/auth/login" || path.startsWith("/_next/") ||
      path === "/favicon.ico" || path === "/robots.txt" || path === "/sitemap.xml") return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value || "";
  if (await validSession(token, secret)) return NextResponse.next();

  if (path.startsWith("/api/")) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", path);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!.*\\.).*)", "/api/:path*"]
};
