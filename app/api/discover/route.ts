import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

export async function POST(req: NextRequest) {
  const apiKey = process.env.HUNTER_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "Hunter is not connected. Add HUNTER_API_KEY in Vercel Environment Variables, then redeploy." }, { status: 503 });
  try {
    const body = await req.json();
    const query = String(body?.query || "").trim();
    const offer = String(body?.offer || "").trim();
    const location = String(body?.location || "").trim();
    if (query.length < 8 || query.length > 500) return NextResponse.json({ error: "Describe your ideal customers in 8–500 characters." }, { status: 400 });
    const searchQuery = [query, offer, location ? "located in " + location : ""].filter(Boolean).join(". ");
    const response = await fetch("https://api.hunter.io/v2/discover", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query: searchQuery, limit: 30 }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(payload?.errors) ? payload.errors.map((e: any) => e?.details || e?.code || e?.message).filter(Boolean).join(" ") : String(payload?.message || "");
      const message = response.status === 403 ? (detail || "Your Hunter plan may not include Discover API access.") : response.status === 401 ? "Hunter did not accept the API key. Check HUNTER_API_KEY in Vercel." : detail || "Hunter could not complete the company search. Check your account limits and try again.";
      return NextResponse.json({ error: message }, { status: response.status === 429 ? 429 : 502 });
    }
    const companies = (Array.isArray(payload?.data) ? payload.data : []).map((item: any) => {
      const domain = String(item?.domain || "").toLowerCase().trim();
      return {
        company: String(item?.organization || domain || "Company not listed"),
        domain,
        contacts: [],
        emailsCount: {
          personal: Number(item?.emails_count?.personal || 0),
          generic: Number(item?.emails_count?.generic || 0),
          total: Number(item?.emails_count?.total || 0)
        }
      };
    }).filter((item: any) => item.domain).slice(0, 30);
    return NextResponse.json({
      companies,
      prospectCount: companies.reduce((sum: number, item: any) => sum + item.emailsCount.personal, 0),
      totalMatches: Number(payload?.meta?.results || companies.length),
      filtersApplied: location ? "Search description includes location: " + location + "." : "Worldwide search based on your description.",
      note: "Hunter Discover finds matching companies. Choose a company to search its professional email addresses; that separate search may use credits."
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "Hunter took too long to respond. Please try again." : "Could not complete the Hunter company search. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
