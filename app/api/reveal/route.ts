import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const clientId = process.env.SNOV_API_USER_ID?.trim();
  const clientSecret = process.env.SNOV_API_SECRET?.trim();
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Snov.io credentials are not configured." }, { status: 503 });
  try {
    const body = await req.json();
    const prospectHash = String(body?.prospectHash || "");
    if (!/^[a-f0-9]{20,200}$/i.test(prospectHash)) return NextResponse.json({ error: "This prospect does not have a valid email-reveal reference." }, { status: 400 });
    const tokenForm = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
    const auth = await fetch("https://api.snov.io/v1/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: tokenForm, cache: "no-store", signal: AbortSignal.timeout(8000) });
    const authData = await auth.json().catch(() => ({}));
    if (!auth.ok || !authData.access_token) return NextResponse.json({ error: "Snov.io authentication failed. Check your credentials." }, { status: 502 });
    const token = String(authData.access_token);
    const start = await fetch("https://api.snov.io/v2/database-search/prospects/search-emails/start/" + prospectHash, {
      method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ access_token: token }), cache: "no-store", signal: AbortSignal.timeout(8000)
    });
    const started = await start.json().catch(() => ({}));
    if (!start.ok) return NextResponse.json({ error: String(started?.message || started?.error || "Snov.io could not reveal this email. Check API access and available credits.") }, { status: 502 });
    const taskHash = String(started?.meta?.task_hash || started?.data?.task_hash || "");
    if (!/^[a-f0-9]{20,100}$/i.test(taskHash)) return NextResponse.json({ error: "Snov.io did not return an email lookup task." }, { status: 502 });
    let result: any = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch("https://api.snov.io/v2/database-search/prospects/search-emails/result/" + taskHash, { headers: { "Authorization": "Bearer " + token, "Accept": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(7000) });
      result = await res.json().catch(() => ({}));
      if (!res.ok || result?.email || result?.status === "completed") break;
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    return NextResponse.json({ email: String(result?.email || result?.data?.email || ""), verification: String(result?.smtp_status || result?.email_status || "unknown"), note: "Snov.io may charge one credit when it finds an email address." });
  } catch {
    return NextResponse.json({ error: "Could not retrieve this email from Snov.io. Please try again." }, { status: 502 });
  }
}
