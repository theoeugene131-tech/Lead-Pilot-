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
      return NextResponse.json({ error: "This email is not authorised for the LeadPilot owner account." }, { status: 403 });
    }
    if (!password || password.length > 256) {
      return NextResponse.json({ error: "Enter your password." }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      const message = error?.message?.toLowerCase().includes("email not confirmed")
        ? "Please confirm your owner email address before signing in."
        : "Email or password is incorrect.";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not process sign-in. Check the Supabase configuration." }, { status: 503 });
  }
}
