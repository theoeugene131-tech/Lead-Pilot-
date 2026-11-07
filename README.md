# LeadPilot AI

LeadPilot AI is a prospect research and outreach workspace built with Next.js.

## Current functionality
- Responsive dashboard and workspace navigation.
- Public company website analysis through `POST /api/analyze`.
- Extracts public homepage title, description and headings, then suggests an initial customer segment and decision-maker roles.
- Hunter-powered company discovery through `POST /api/discover` using a natural-language target-market description.
- Opt-in Hunter Domain Search through `POST /api/contacts` to retrieve professional contact details for a selected company. This can consume provider credits.
- Search and CSV export for the clearly labelled illustrative sample records.

## Configure Hunter
1. Create or sign in to a Hunter account at https://hunter.io/.
2. Generate an API key in your Hunter account.
3. In your Vercel project, open Settings → Environment Variables.
4. Add `HUNTER_API_KEY` with your private API key. Enable it for the Production environment (and Preview if needed).
5. Redeploy the project after adding the variable.

For local development, copy `.env.example` to `.env.local` and add the key there. Never commit a real API key to GitHub.

Hunter Discover access and email lookup limits depend on the Hunter account plan and available credits. Review the provider's pricing and terms before use.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Current limitations
- Website analysis is a lightweight public-homepage parser, not a full AI business analysis.
- Hunter Discover returns matching companies and estimated email counts; contact details are retrieved only when the user explicitly selects a company and requests a contact search.
- No automated email sending, sequences, follow-ups, inbox/reply tracking, database persistence, authentication, billing, or multi-tenant account separation is implemented yet.
- The sample contacts are fictional placeholders using reserved `.invalid` email domains. They are not real contacts.

## Production safeguards still required
Before offering this as a multi-client SaaS, implement authentication and tenant isolation, persistent storage, provider usage limits and audit logs. For outreach, add human approval before sends, sender authentication, unsubscribe links, suppression lists, bounce handling, rate limits, and applicable privacy-law checks (including Nigeria's NDPA where relevant). Do not send unsolicited bulk email.
