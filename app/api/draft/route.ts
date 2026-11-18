import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const company = String(body?.company || "").trim().slice(0, 120);
    const person = String(body?.person || "").trim().slice(0, 100);
    const role = String(body?.role || "").trim().slice(0, 120);
    const website = String(body?.website || "").trim().slice(0, 200);
    const offer = String(body?.offer || "").trim().slice(0, 500);
    if (!company || !offer) return NextResponse.json({ error: "Company and your product or service offer are required." }, { status: 400 });
    const greeting = person ? `Hello ${person.split(/\\s+/)[0]},` : "Hello,";
    const subject = `A quick question for ${company}`;
    const bodyText = [
      greeting,
      "",
      `I came across ${company}${website ? ` (${website})` : ""} and wanted to reach out. ${role ? `Given your role as ${role}, ` : ""}I thought this may be relevant to your team.`,
      "",
      offer,
      "",
      "Would you be open to a brief conversation to see whether this could be useful? If I have the wrong contact or this is not relevant, please let me know and I will not follow up.",
      "",
      "Unsubscribe: Reply with unsubscribe if you do not want further outreach.",
      "",
      "Best regards,",
      "[Your name]",
      "[Your business / contact details]"
    ].join("\\n");
    return NextResponse.json({ subject, body: bodyText, note: "Draft only. Review accuracy, lawful basis and recipient expectations before sending. No email has been sent." });
  } catch {
    return NextResponse.json({ error: "Could not prepare this draft. Please try again." }, { status: 400 });
  }
}
