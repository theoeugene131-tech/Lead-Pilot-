import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const maxDuration = 15;

function isPrivateAddress(ip: string) {
  if (net.isIPv4(ip)) {
    const [a,b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") ||
    v.startsWith("fe80:") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.");
}

function getMeta(html: string, key: string, attr = "name") {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("<meta[^>]+" + attr + "=[\"']" + escaped + "[\"'][^>]+content=[\"']([^\"']*)[\"'][^>]*>|<meta[^>]+content=[\"']([^\"']*)[\"'][^>]+" + attr + "=[\"']" + escaped + "[\"'][^>]*>", "i");
  const m = html.match(re);
  return (m?.[1] || m?.[2] || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
}

function cleanText(html: string) {
  return html.replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim().slice(0, 9000);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw = String(body?.website || "").trim();
    const goal = String(body?.goal || "Find companies likely to need my product or service").slice(0, 240);
    if (!raw || raw.length > 2048) return NextResponse.json({ error: "Enter a valid company website." }, { status: 400 });
    const url = new URL(raw.startsWith("http") ? raw : "https://" + raw);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      return NextResponse.json({ error: "Only public HTTP or HTTPS websites are supported." }, { status: 400 });
    if (["localhost", "127.0.0.1", "::1"].includes(url.hostname) || url.hostname.endsWith(".local"))
      return NextResponse.json({ error: "Private and local addresses are not allowed." }, { status: 400 });
    const records = await lookup(url.hostname, { all: true, verbatim: true });
    if (!records.length || records.some(r => isPrivateAddress(r.address)))
      return NextResponse.json({ error: "This website resolves to a private or restricted network address." }, { status: 400 });
    const response = await fetch(url.toString(), {
      headers: { "user-agent": "LeadPilotResearchBot/1.0 (+public website business profile analysis)", "accept": "text/html,application/xhtml+xml" },
      redirect: "manual", signal: AbortSignal.timeout(12000)
    });
    if (response.status >= 300 && response.status < 400)
      return NextResponse.json({ error: "This website redirects. Enter its final public URL and try again." }, { status: 400 });
    if (!response.ok) return NextResponse.json({ error: "The website could not be opened (HTTP " + response.status + ")." }, { status: 422 });
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return NextResponse.json({ error: "That address did not return a web page." }, { status: 422 });
    const html = (await response.text()).slice(0, 1_000_000);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname).replace(/<[^>]+>/g, "").trim().slice(0, 180);
    const description = getMeta(html, "description") || getMeta(html, "og:description", "property");
    const headings = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => cleanText(m[1])).filter(Boolean).slice(0, 4);
    const pageText = cleanText(html);
    const summary = description || headings[0] || pageText.slice(0, 420) || "No business description was found on the homepage.";
    const hints = [
      { pattern: /software|platform|saas|app|technology|api/i, segment: "Technology and software buyers", roles: "CTO, Head of IT, Product Manager, Operations Director" },
      { pattern: /consult|agency|marketing|design|creative/i, segment: "Businesses buying professional services", roles: "Founder, Managing Director, Marketing Director" },
      { pattern: /wholesale|distribut|manufactur|supplier/i, segment: "Retailers, distributors and procurement teams", roles: "Procurement Manager, Operations Director, Business Owner" },
      { pattern: /property|real estate|estate|construction/i, segment: "Property and construction businesses", roles: "Managing Director, Property Manager, Development Director" },
      { pattern: /education|school|training|course/i, segment: "Schools, training providers and education teams", roles: "School Administrator, Training Manager, Director" }
    ];
    const match = hints.find(h => h.pattern.test(title + " " + summary + " " + pageText.slice(0, 2500)));
    return NextResponse.json({
      website: url.origin, title, description: summary, headings,
      businessSnapshot: pageText.slice(0, 1200),
      goal,
      suggestedSegments: [match?.segment || "Companies with a clear need for your stated offer"],
      suggestedDecisionMakers: [match?.roles || "Founder, CEO, Managing Director, Department Head"],
      researchStatus: "Website analysis complete. No third-party lead database has been queried."
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "The website took too long to respond. Try again." : "We could not analyse that website. Check the address and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}