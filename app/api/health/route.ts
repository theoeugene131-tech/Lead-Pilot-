import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hunterConfigured = Boolean(process.env.HUNTER_API_KEY?.trim());
  return NextResponse.json({
    ok: true,
    app: "LeadPilot AI",
    hunterConfigured,
    message: hunterConfigured
      ? "LeadPilot is running and the Hunter API key is configured."
      : "LeadPilot is running, but Hunter is not configured. Add HUNTER_API_KEY in Vercel and redeploy."
  });
}
