import { NextRequest, NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";
export const maxDuration = 15;

function isPrivateAddress(ip: string) {
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113);
  }
  if (!net.isIPv6(ip)) return true;
  const v = ip.toLowerCase();
  // Only globally-routable IPv6 unicast space is accepted. This excludes
  // loopback, link-local, unique-local, multicast, mapped and transition ranges.
  if (!/^2[0-9a-f]{3}:/.test(v)) return true;
  return v.startsWith("2001:db8:") || v.startsWith("2001:10:") ||
    v.startsWith("2001:20:") || v.startsWith("2002:") || v.startsWith("3fff:");
}

async function readHtmlWithLimit(response: Response, maxBytes: number) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > maxBytes) throw new Error("PAGE_TOO_LARGE");
  if (!response.body) throw new Error("EMPTY_RESPONSE");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("PAGE_TOO_LARGE");
    }
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
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
    const hostname = url.hostname.replace(/^\\[|\\]$/g, "").toLowerCase();
    if (hostname === "localhost" || hostname.endsWith(".localhost") ||
        hostname.endsWith(".local") || hostname.endsWith(".internal"))
      return NextResponse.json({ error: "Private and local addresses are not allowed." }, { status: 400 });
    const records = net.isIP(hostname)
      ? [{ address: hostname }]
      : await lookup(hostname, { all: true, verbatim: true });
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
    let html: string;
    try {
      html = await readHtmlWithLimit(response, 1_000_000);
    } catch (error) {
      if (error instanceof Error && error.message === "PAGE_TOO_LARGE")
        return NextResponse.json({ error: "This website's homepage is too large to analyse. Try a simpler public page." }, { status: 413 });
      throw error;
    }
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url.hostname).replace(/<[^>]+>/g, "").trim().slice(0, 180);
    const description = getMeta(html, "description") || getMeta(html, "og:description", "property");
    const headings = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => cleanText(m[1])).filter(Boolean).slice(0, 4);
    const pageText = cleanText(html);
    const summary = description || headings[0] || pageText.slice(0, 420) || "No business description was found on the homepage.";
    const siteText = (title + " " + summary + " " + headings.join(" ") + " " + pageText.slice(0, 5000)).toLowerCase();
    const profiles = [
      {
        id: "receivables",
        pattern: /invoice|accounts receivable|payment reminder|debt collection|collections|overdue payment|late payment|credit control|billing software/,
        segment: "B2B businesses that issue invoices, sell on credit or regularly follow up overdue customer payments",
        industries: "Distributors, wholesalers, manufacturers, professional service firms, agencies and other B2B suppliers",
        roles: "Business Owner, CEO, CFO, Finance Director, Financial Controller, Accounts Receivable Manager, Credit Control Manager"
      },
      {
        id: "software",
        pattern: /software|platform|saas|app|technology|api/,
        segment: "Small and medium-sized organisations that need software to improve business operations",
        industries: "Technology, professional services, retail and other digitally active businesses",
        roles: "Founder, CEO, CTO, Head of IT, Operations Director, Product Manager"
      },
      {
        id: "professional-services",
        pattern: /consult|agency|marketing|design|creative/,
        segment: "Businesses seeking specialist professional, consulting or creative services",
        industries: "Professional services, marketing, media, technology and growing SMEs",
        roles: "Founder, Managing Director, CEO, Marketing Director, Operations Director"
      },
      {
        id: "wholesale",
        pattern: /wholesale|distribut|manufactur|supplier|supply chain/,
        segment: "Retailers and organisations that buy, distribute or manufacture products",
        industries: "Wholesale, distribution, manufacturing, retail and logistics",
        roles: "Procurement Manager, Operations Director, Supply Chain Manager, Managing Director"
      },
      {
        id: "property",
        pattern: /property|real estate|estate agent|construction/,
        segment: "Property, real estate and construction organisations",
        industries: "Real estate, property management, construction and facilities management",
        roles: "Managing Director, Property Manager, Operations Director, Development Director"
      },
      {
        id: "education",
        pattern: /education|school|training|course|learning management/,
        segment: "Schools, training providers and organisations delivering education",
        industries: "Education, vocational training, corporate learning and professional development",
        roles: "School Administrator, Principal, Training Manager, Learning and Development Director"
      },
      {
        id: "ecommerce",
        pattern: /ecommerce|e-commerce|online store|shopify|online retail/,
        segment: "Online retailers and ecommerce brands seeking to grow sales and operations",
        industries: "Ecommerce, retail, consumer goods and online marketplaces",
        roles: "Founder, Ecommerce Manager, Head of Growth, Marketing Director, Operations Manager"
      },
      {
        id: "cybersecurity",
        pattern: /cyber.?security|information security|threat detection|data protection/,
        segment: "Organisations that need to protect business systems, networks and customer data",
        industries: "Financial services, healthcare, technology, government suppliers and enterprise IT",
        roles: "CISO, IT Director, Head of Information Security, CTO, IT Manager"
      }
    ];
    const matched = profiles.find(item => item.pattern.test(siteText));
    const businessLabel = title || url.hostname;
    const offerText = matched?.id === "receivables"
      ? `${businessLabel} provides invoice and accounts receivable tools to help businesses track invoices, follow up overdue payments and manage customer collections.`
      : `${businessLabel}: ${summary}`;
    const suggestedIdealCustomer = matched
      ? `${matched.segment}. Relevant industries: ${matched.industries}. Target decision-makers: ${matched.roles}.`
      : `Businesses likely to benefit from ${summary}. Start with organisations in the industries most closely related to the product or service, and target the people responsible for buying or managing it.`;
    const suggestedSegments = matched
      ? [matched.segment, matched.industries]
      : [`Businesses likely to need ${businessLabel}`];
    const suggestedDecisionMakers = matched
      ? matched.roles.split(", ")
      : ["Founder", "CEO", "Managing Director", "Department Head"];
    return NextResponse.json({
      website: url.origin, title, description: summary, headings,
      businessSnapshot: pageText.slice(0, 1200),
      goal,
      suggestedOffer: offerText,
      suggestedIdealCustomerDescription: suggestedIdealCustomer,
      suggestedSegments,
      suggestedDecisionMakers,
      generationMethod: "Automatically generated from the public website content. Review and edit these suggestions before searching.",
      researchStatus: "Website analysis complete. Your offer and ideal customer profile have been generated. No third-party lead database has been queried."
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError" ? "The website took too long to respond. Try again." : "We could not analyse that website. Check the address and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}