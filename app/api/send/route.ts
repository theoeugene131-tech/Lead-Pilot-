import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest) {
  try {
    const expectedToken = process.env.LEADPILOT_SEND_TOKEN;
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;

    if (!expectedToken || !apiKey || !from) {
      return NextResponse.json({ error: "Email sending is not configured. Add the Resend API key, verified sender address and LeadPilot send token in Vercel." }, { status: 503 });
    }

    const suppliedToken = req.headers.get("x-leadpilot-send-token") || "";
    if (suppliedToken.length !== expectedToken.length || !Buffer.from(suppliedToken).equals(Buffer.from(expectedToken))) {
      return NextResponse.json({ error: "Sending is not authorised." }, { status: 401 });
    }

    const body = await req.json();
    const to = String(body?.to || "").trim().slice(0, 254);
    const subject = String(body?.subject || "").trim().slice(0, 180);
    const text = String(body?.text || "").trim().slice(0, 12000);

    if (body?.approved !== true) return NextResponse.json({ error: "Explicit approval is required before sending." }, { status: 400 });
    if (!validEmail(to) || !subject || !text) return NextResponse.json({ error: "A valid recipient, subject and message are required." }, { status: 400 });
    if (!/(^|\n)\s*(unsubscribe|stop receiving)\b/i.test(text)) {
      return NextResponse.json({ error: "Add a clear unsubscribe instruction before sending outreach." }, { status: 400 });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: result?.message || "The email provider rejected the message." }, { status: response.status >= 500 ? 502 : 400 });
    }
    return NextResponse.json({ success: true, id: result?.id || null });
  } catch {
    return NextResponse.json({ error: "Could not send this email. Please try again." }, { status: 400 });
  }
}
