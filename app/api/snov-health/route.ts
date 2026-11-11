import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

// Exchanges Snov.io credentials for a short-lived token. This does not search
// for contacts or consume prospecting credits.
export async function POST(_req: NextRequest) {
  const clientId = process.env.SNOV_API_USER_ID?.trim();
  const clientSecret = process.env.SNOV_API_SECRET?.trim();

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      ok: false,
      message: "Snov.io credentials are not fully configured in Vercel."
    }, { status: 503 });
  }

  try {
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret
    });
    const response = await fetch("https://api.snov.io/v1/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.access_token) {
      return NextResponse.json({
        ok: false,
        message: "Snov.io did not accept the credentials. Check the API User ID and API Secret, and whether your account has API test access."
      }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      message: "Snov.io accepted the credentials and issued an access token. Prospecting API access may still require Snov.io approval."
    });
  } catch {
    return NextResponse.json({
      ok: false,
      message: "Could not reach Snov.io. Please try again."
    }, { status: 502 });
  }
}
