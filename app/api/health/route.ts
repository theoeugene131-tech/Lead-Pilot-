import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: "LeadPilot AI",
    hunterConfigured: Boolean(process.env.HUNTER_API_KEY),
    message: process.env.HUNTER_API_KEY
      ? "LeadPilot is running and the Hunter API key is present."
      : "LeadPilot is running, but HUNTER_API_KEY is missing from this deployment."
  });
}
