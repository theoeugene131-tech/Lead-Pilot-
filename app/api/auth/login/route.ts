import { NextRequest, NextResponse } from "next/server";
import {
  createOwnerSession,
  getOwnerEmail,
  OWNER_SESSION_COOKIE,
  OWNER_SESSION_MAX_AGE_SECONDS,
  verifyOwnerPassword
} from "../../../../lib/server/owner-session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!process.env.LEADPILOT_ACCESS_PASSWORD || (process.env.LEADPILOT_SESSION_SECRET || "").length < 32) {
      return NextResponse.json({
        error: "Owner login is not configured. Add LEADPILOT_ACCESS_PASSWORD and a 32-character-or-longer LEADPILOT_SESSION_SECRET in Vercel."
      }, { status: 503 });
    }
    if (!email || email !== getOwnerEmail()) {
      return NextResponse.json({ error: "This email is not authorised for the LeadPilot owner account." }, { status: 403 });
    }
    if (!password || password.length > 256) {
      return NextResponse.json({ error: "Enter your password." }, { status: 400 });
    }
    if (!await verifyOwnerPassword(password)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const token = await createOwnerSession(email);
    const response = NextResponse.json({ success: true });
    response.cookies.set(OWNER_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: OWNER_SESSION_MAX_AGE_SECONDS
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not process sign-in. Check the owner login environment settings." }, { status: 503 });
  }
}
