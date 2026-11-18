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
    const exclusionInstruction = "Find commercially operated private-sector businesses that are likely to buy the described product or service. Exclude government bodies, ministries, departments, public agencies, municipal or state authorities, public-sector services, schools, colleges, universities, educational institutions, hospitals, clinics, charities, non-profits, NGOs, foundations, religious organisations, trade associations, and public institutions.";
    const searchQuery = [query, offer, location ? "located in " + location : "", exclusionInstruction].filter(Boolean).join(". ");
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
    const excludedTerms = [
      "government", "govt", "ministry", "department of", "federal agency", "state agency",
      "public agency", "government agency", "municipal", "municipality", "city council",
      "county council", "local authority", "public authority", "bureau of", "national park service",
      "internal revenue service", "department of veterans", "public service", "civil service",
      "university", "universities", "college", "colleges", "school district", "public school",
      "academy", "hospital", "health authority", "charity", "charitable", "nonprofit",
      "non-profit", "non profit", "ngo", "foundation", "church", "mosque", "temple",
      "religious", "trade association", "professional association", "public institution"
    ];
    const excludedDomainEndings = [".gov", ".gov.uk", ".gov.ng", ".mil", ".edu"];
    const rawCompanies = (Array.isArray(payload?.data) ? payload.data : []).map((item: any) => {
      const domain = String(item?.domain || "").toLowerCase().trim();
      const company = String(item?.organization || domain || "Company not listed").trim();
      const searchable = (company + " " + domain).toLowerCase();
      const institutionalMatch = excludedTerms.some(term => searchable.includes(term));
      const publicDomain = excludedDomainEndings.some(suffix => domain === suffix.slice(1) || domain.endsWith(suffix));
      return {
        company,
        domain,
        contacts: [],
        excluded: institutionalMatch || publicDomain,
        emailsCount: {
          personal: Number(item?.emails_count?.personal || 0),
          generic: Number(item?.emails_count?.generic || 0),
          total: Number(item?.emails_count?.total || 0)
        }
      };
    }).filter((item: any) => item.domain);
    const excludedCount = rawCompanies.filter((item: any) => item.excluded).length;
    const companies = rawCompanies.filter((item: any) => !item.excluded).map(({ excluded, ...item }: any) => item).slice(0, 30);
    return NextResponse.json({
      companies,
      prospectCount: companies.reduce((sum: number, item: any) => sum + item.emailsCount.personal, 0),
      totalMatches: Number(payload?.meta?.results || rawCompanies.length),
      excludedCount,
      filtersApplied: "Commercial-business focus. Government agencies, public bodies, educational and healthcare institutions, charities, NGOs, foundations and religious organisations are excluded." + (location ? " Location: " + location + "." : " Worldwide search."),
      note: "Institutional exclusions are applied to company names and domains. Review the remaining companies for fit before revealing contact emails."
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "Hunter took too long to respond. Please try again." : "Could not complete the Hunter company search. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
