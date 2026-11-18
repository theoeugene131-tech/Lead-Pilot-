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

    if (!company || !offer) {
      return NextResponse.json({ error: "Company and your product or service offer are required. Please check your business offer above." }, { status: 400 });
    }

    const firstName = person ? person.split(/\\s+/)[0] : "";
    const greeting = firstName ? `Hello ${firstName},` : "Hello,";
    const subject = `A practical idea for ${company}`;
    const relevance = role
      ? `I’m reaching out because your role as ${role} may make this relevant to your work at ${company}.`
      : `I’m reaching out because this may be relevant to the work your team does at ${company}.`;
    const bodyText = [
      greeting,
      "",
      `I wanted to introduce myself and share an idea that may be useful to ${company}.`,
      relevance,
      "",
      "HOW WE MAY HELP",
      offer,
      "",
      "Would you be open to a short conversation to see whether this could be useful to your team?",
      "",
      "If I have contacted the wrong person, or this is not relevant, please let me know. I will respect your preference.",
      "",
      "If you do not want further emails, reply with “unsubscribe” and I will not contact you again.",
      "",
      "Best regards,",
      "[Your full name]",
      "[Your business]",
      "[Your contact details]",
      website ? `Website: ${website}` : ""
    ].filter(Boolean).join("\\n");

    return NextResponse.json({
      subject,
      body: bodyText,
      note: "Draft only. Personalise the message, check the recipient and make sure you have a lawful basis to contact them. No email has been sent."
    });
  } catch {
    return NextResponse.json({ error: "Could not prepare this draft. Please try again." }, { status: 400 });
  }
}
