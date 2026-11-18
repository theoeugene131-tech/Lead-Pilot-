import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET() {
  const apiKey = process.env.HUNTER_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      hunterConfigured: false,
      message: "Hunter API key is missing. Add HUNTER_API_KEY in Vercel and redeploy."
    }, { status: 503 });
  }

  try {
    // Hunter's Account endpoint is free and verifies the key without using search credits.
    const response = await fetch("https://api.hunter.io/v2/account", {
      method: "GET",
      headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const details = Array.isArray(payload?.errors)
        ? payload.errors.map((item: any) => item?.details || item?.message || item?.code).filter(Boolean).join(" ")
        : "";
      const message = response.status === 401
        ? "Hunter rejected the API key. Check that HUNTER_API_KEY is copied correctly in Vercel, then redeploy."
        : response.status === 403
          ? details || "Hunter denied this request. Check your account or API access."
          : details || "Hunter connection could not be verified. Please try again.";
      return NextResponse.json({ ok: false, hunterConfigured: true, message }, { status: 502 });
    }

    const account = payload?.data || {};
    return NextResponse.json({
      ok: true,
      hunterConfigured: true,
      accountName: [account.first_name, account.last_name].filter(Boolean).join(" "),
      plan: account.plan_name || null,
      message: "Hunter connection successful. Your API key is valid. This check used no search credits."
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Hunter took too long to respond. Please try again."
      : "Could not reach Hunter to verify the connection. Please try again.";
    return NextResponse.json({ ok: false, hunterConfigured: true, message }, { status: 502 });
  }
}
