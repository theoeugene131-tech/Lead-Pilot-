import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hunterConfigured = Boolean(process.env.HUNTER_API_KEY);
  const snovConfigured = Boolean(process.env.SNOV_API_USER_ID && process.env.SNOV_API_SECRET);
  return NextResponse.json({
    ok: true,
    app: "LeadPilot AI",
    hunterConfigured,
    snovConfigured,
    message: hunterConfigured
      ? "LeadPilot is running and the Hunter API key is present."
      : "LeadPilot is running. Hunter is not configured."
  });
}
