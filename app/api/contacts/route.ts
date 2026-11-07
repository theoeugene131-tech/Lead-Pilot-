import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add HUNTER_API_KEY to your deployment environment variables first." }, { status: 503 });
  try {
    const body = await req.json();
    const domain = String(body?.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain))
      return NextResponse.json({ error: "A valid company domain is required." }, { status: 400 });
    const url = new URL("https://api.hunter.io/v2/domain-search");
    url.searchParams.set("domain", domain);
    url.searchParams.set("decision_maker", "true");
    url.searchParams.set("limit", "10");
    const response = await fetch(url, {
      headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(payload?.errors) ? payload.errors.map((e: {details?:string}) => e.details).filter(Boolean).join(" ") : "";
      return NextResponse.json({ error: detail || "The provider could not retrieve contacts for this domain. Check your account credits and plan." }, { status: response.status === 429 ? 429 : 502 });
    }
    const emails = Array.isArray(payload?.data?.emails) ? payload.data.emails.map((e: any) => ({
      email: String(e.value || ""),
      name: [e.first_name, e.last_name].filter(Boolean).join(" "),
      position: String(e.position || ""),
      department: String(e.department || ""),
      seniority: String(e.seniority || ""),
      confidence: Number(e.confidence || 0),
      verification: String(e.verification?.status || "unknown"),
      decisionMaker: e.decision_maker === true,
      sourceCount: Array.isArray(e.sources) ? e.sources.length : 0
    })).filter((e: {email:string}) => e.email) : [];
    return NextResponse.json({
      domain,
      company: payload?.data?.organization || domain,
      contacts: emails,
      totalAvailable: Number(payload?.meta?.results || emails.length),
      creditsUsed: response.headers.get("X-Credits-Used") || "not reported",
      note: "Contacts are sourced from Hunter's data. Check applicable privacy and outreach rules before contacting anyone."
    });
  } catch {
    return NextResponse.json({ error: "Contact search timed out or could not reach the provider." }, { status: 502 });
  }
}