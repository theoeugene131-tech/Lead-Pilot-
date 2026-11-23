import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const runtime = "nodejs";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      return NextResponse.json({ error: "Email sending is not configured. Check the Resend API key and verified sender address in Vercel." }, { status: 503 });
    }

    const body = await req.json();
    const to = String(body?.to || "").trim().slice(0, 254);
    const subject = String(body?.subject || "").trim().slice(0, 180);
    const text = String(body?.text || "").trim().slice(0, 12000);

    if (body?.approved !== true) return NextResponse.json({ error: "Explicit approval is required before sending." }, { status: 400 });
    if (!validEmail(to) || !subject || !text) return NextResponse.json({ error: "A valid recipient, subject and message are required." }, { status: 400 });
    if (body?.test !== true) {
      const { data: memberships, error: membershipError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);
      if (membershipError || !memberships?.length) {
        return NextResponse.json({ error: "Could not verify your workspace before sending. Please try again." }, { status: 503 });
      }
      const workspaceIds = memberships.map((membership: { workspace_id: string }) => membership.workspace_id);
      const [suppressionCheck, leadCheck] = await Promise.all([
        supabase.from("email_suppressions").select("id").in("workspace_id", workspaceIds).ilike("email", to).limit(1),
        supabase.from("leads").select("id").in("workspace_id", workspaceIds).ilike("email", to).in("status", ["unsubscribed", "do_not_contact"]).limit(1)
      ]);
      if (suppressionCheck.error || leadCheck.error) {
        return NextResponse.json({ error: "Could not verify the unsubscribe and do-not-contact lists. Email was not sent." }, { status: 503 });
      }
      if ((suppressionCheck.data?.length || 0) > 0 || (leadCheck.data?.length || 0) > 0) {
        return NextResponse.json({ error: "This address is on your workspace suppression or do-not-contact list. Email was not sent." }, { status: 409 });
      }
    }

    if (body?.test !== true && !/(^|\n)\s*(unsubscribe|stop receiving)\b/i.test(text)) {
      return NextResponse.json({ error: "Add a clear unsubscribe instruction before sending outreach." }, { status: 400 });
    }

    let response: Response;
    try {
      response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(12000)
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        return NextResponse.json({ error: "Resend did not respond within 12 seconds. Check your email provider status before retrying, to avoid sending a duplicate." }, { status: 504 });
      }
      throw error;
    }

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: result?.message || "The email provider rejected the message." }, { status: response.status >= 500 ? 502 : 400 });
    }
    return NextResponse.json({ success: true, id: result?.id || null });
  } catch {
    return NextResponse.json({ error: "Could not process this email request. Please check the details and try again." }, { status: 400 });
  }
}
