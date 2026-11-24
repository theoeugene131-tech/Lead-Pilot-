import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const ownerEmail = (process.env.LEADPILOT_OWNER_EMAIL || "tnwokobia@gmail.com").trim().toLowerCase();
    if (!email || email !== ownerEmail) {
      return NextResponse.json({ error: "Only the configured LeadPilot owner email can register." }, { status: 403 });
    }
    if (password.length < 12 || password.length > 256) {
      return NextResponse.json({ error: "Choose a password with at least 12 characters." }, { status: 400 });
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: new URL("/auth/callback", request.url).toString() },
    });
    if (error) {
      const message = error.message.toLowerCase().includes("already")
        ? "An account already exists for this email. Sign in instead or reset its password in Supabase."
        : "Could not create the owner account. Check Supabase Auth settings and try again.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (!data.session) {
      return NextResponse.json({ success: true, confirmationRequired: true, message: "Owner account created. Check your inbox and confirm the email address before signing in." });
    }
    return NextResponse.json({ success: true, confirmationRequired: false, message: "Owner account created. You can now sign in." });
  } catch {
    return NextResponse.json({ error: "Could not create the owner account. Check the Supabase configuration." }, { status: 503 });
  }
}