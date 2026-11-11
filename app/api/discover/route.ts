import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

async function getToken() {
  const clientId = process.env.SNOV_API_USER_ID?.trim();
  const clientSecret = process.env.SNOV_API_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Add SNOV_API_USER_ID and SNOV_API_SECRET to Vercel environment variables.");
  const form = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
  const res = await fetch("https://api.snov.io/v1/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form, cache: "no-store", signal: AbortSignal.timeout(9000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error("Snov.io did not issue an access token. Check your API credentials.");
  return String(data.access_token);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = String(body?.query || "").trim();
    if (query.length < 8 || query.length > 500) return NextResponse.json({ error: "Describe your ideal customers in 8–500 characters." }, { status: 400 });
    const offer = String(body?.offer || "").trim().slice(0, 500);
    const combined = (query + " " + offer).toLowerCase();
    const erpTerms = /\berp\b|enterprise resource planning|inventory|accounting software|procurement|warehouse|stock management|business management software/.test(combined);
    const industryMap = [
      { test: /manufactur|factory|production|industrial/, values: ["Manufacturing"] },
      { test: /wholesale|distribut|import|export/, values: ["Wholesale", "Import and Export"] },
      { test: /retail|shop|e-commerce|ecommerce/, values: ["Retail"] },
      { test: /logistic|supply chain|freight|transport|warehouse/, values: ["Logistics and Supply Chain", "Transportation/Trucking/Railroad", "Warehousing"] },
      { test: /construction|building material|engineering contractor/, values: ["Construction", "Building Materials"] },
      { test: /food|beverage|agricultur|farm|processing/, values: ["Food & Beverages", "Food Production", "Farming"] }
    ];
    const industries = Array.from(new Set(industryMap.filter(item => item.test.test(combined)).flatMap(item => item.values)));
    if (erpTerms && industries.length === 0) industries.push("Manufacturing", "Wholesale", "Retail", "Logistics and Supply Chain");
    const titles = erpTerms
      ? ["Chief Executive Officer", "Managing Director", "Chief Operating Officer", "Chief Financial Officer", "Finance Director", "Head of Finance", "Finance Manager", "Operations Director", "Head of Operations", "Operations Manager", "IT Director", "IT Manager", "Chief Information Officer", "Procurement Manager", "Supply Chain Manager", "Warehouse Manager", "ERP Manager"]
      : ["Founder", "Co-Founder", "Chief Executive Officer", "Managing Director", "Chief Operating Officer", "Head of Operations", "Finance Director", "Chief Financial Officer", "Head of Finance", "Director"];
    const filters: any = { prospect: { job_titles: { include: titles }, management_levels: { include: ["c_level", "director_level", "vp_level", "manager_level"] } } };
    if (erpTerms) filters.prospect.departments = { include: ["operations", "finance_administration", "it_is"] };
    if (industries.length) filters.company = { industries: { include: industries } };
    const token = await getToken();
    const start = await fetch("https://api.snov.io/v2/database-search/prospects/start", {
      method: "POST",
      headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ filters, page: 1 }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
    const started = await start.json().catch(() => ({}));
    if (!start.ok) {
      const detail = String(started?.message || started?.error || "");
      const approval = start.status === 401 || start.status === 403;
      return NextResponse.json({ error: approval ? "Snov.io accepted your credentials, but prospecting API access may not be enabled yet. Request Database Search API test access from help@snov.io." : (detail || "Snov.io could not start the prospect search. Check your API access and account limits.") }, { status: 502 });
    }
    const taskHash = String(started?.data?.task_hash || started?.meta?.task_hash || "");
    if (!/^[a-f0-9]{20,100}$/i.test(taskHash)) return NextResponse.json({ error: "Snov.io did not return a valid search task. Please try again." }, { status: 502 });
    let result: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch("https://api.snov.io/v2/database-search/prospects/result/" + taskHash, { headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(7000) });
      result = await response.json().catch(() => ({}));
      if (!response.ok) break;
      if (result?.status === "completed" || Array.isArray(result?.data?.prospects)) break;
      await new Promise(resolve => setTimeout(resolve, 900));
    }
    if (!result || result?.status === "in_progress") return NextResponse.json({ error: "Snov.io is still preparing results. Please run the search again in a moment." }, { status: 202 });
    if (result?.error || result?.message && !Array.isArray(result?.data?.prospects)) return NextResponse.json({ error: String(result.message || result.error) }, { status: 502 });
    const prospects = Array.isArray(result?.data?.prospects) ? result.data.prospects : [];
    const grouped = new Map<string, any>();
    for (const p of prospects) {
      const company = p?.company || {};
      const domain = String(company.domain || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      const name = String(company.name || domain || "Company not listed");
      const key = domain || name;
      if (!grouped.has(key)) grouped.set(key, { company: name, domain, availableEmails: 0, contacts: [] });
      const revealUrl = String(p?.email_and_hidden_info_reveal || "");
      const hash = revealUrl.match(/\/search-emails\/start\/([a-f0-9]{20,200})/i)?.[1] || "";
      grouped.get(key).contacts.push({
        name: [p?.first_name, p?.last_name].filter(Boolean).join(" "),
        position: String(p?.job_title || ""),
        email: "",
        verification: "not revealed",
        confidence: 0,
        location: String(p?.location || ""),
        industry: String(p?.industry || company.industry || ""),
        prospectHash: hash,
        linkedin: ""
      });
    }
    const companies = Array.from(grouped.values()).slice(0, 30);
    return NextResponse.json({ companies, prospectCount: prospects.length, totalMatches: Number(result?.data?.total || prospects.length), filtersApplied: industries.length ? "Industry filters: " + industries.join(", ") + ". Decision-maker roles focus on operations, finance and IT." : "Decision-maker job titles and seniority filters applied. Add a specific industry or location to narrow results.", note: "Prospect profiles are from Snov.io. Email addresses are hidden until you choose to reveal an individual contact." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete the Snov.io search.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
