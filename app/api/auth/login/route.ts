import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(req: NextRequest) {
  const expected = process.env.LEADPILOT_ACCESS_PASSWORD;
  const secret = process.env.LEADPILOT_SESSION_SECRET;
  if (!expected || !secret) return NextResponse.json({ error: "Access protection is not configured yet. Add LEADPILOT_ACCESS_PASSWORD and LEADPILOT_SESSION_SECRET in Vercel." }, { status: 503 });
  try {
    const body = await req.json();
    const supplied = typeof body?.password === "string" ? body.password : "";
    if (!supplied || supplied.length > 256 || !safeEqual(supplied, expected)) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12 })).toString("base64url");
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    const response = NextResponse.json({ success: true });
    response.cookies.set("leadpilot_session", payload + "." + signature, {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "strict", path: "/", maxAge: 60 * 60 * 12
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not process sign-in." }, { status: 400 });
  }
}
