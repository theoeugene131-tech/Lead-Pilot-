import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return NextResponse.json({
    error: "Lead discovery is not connected yet. Add HUNTER_API_KEY in your Vercel project environment variables."
  }, { status: 503 });
  try {
    const body = await req.json();
    const query = String(body?.query || "").trim();
    if (!query || query.length < 8 || query.length > 500)
      return NextResponse.json({ error: "Describe the type of companies you want to find (8–500 characters)." }, { status: 400 });
    const response = await fetch("https://api.hunter.io/v2/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey, "Accept": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(payload?.errors) ? payload.errors.map((e: {details?:string}) => e.details).filter(Boolean).join(" ") : "";
      const status = response.status === 429 ? 429 : response.status === 401 ? 502 : 502;
      return NextResponse.json({ error: detail || "The lead-data provider could not complete this search. Check your Hunter plan and API key." }, { status });
    }
    const companies = Array.isArray(payload?.data) ? payload.data.slice(0, 25).map((c: any) => ({
      company: String(c.organization || c.domain || "Unknown company"),
      domain: String(c.domain || ""),
      availableEmails: Number(c.emails_count?.total || 0),
      personalEmails: Number(c.emails_count?.personal || 0),
      genericEmails: Number(c.emails_count?.generic || 0)
    })) : [];
    return NextResponse.json({
      companies,
      totalMatches: Number(payload?.meta?.results || companies.length),
      note: "Company discovery is provided by Hunter. Email counts are estimates; no individual email addresses have been retrieved yet."
    });
  } catch {
    return NextResponse.json({ error: "Lead discovery timed out or could not reach the provider. Please try again." }, { status: 502 });
  }
}