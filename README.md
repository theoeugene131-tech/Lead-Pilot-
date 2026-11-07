# LeadPilot AI

LeadPilot AI is a prospect-research and outreach workspace. This repository contains the first responsive dashboard foundation.

## Current features
- Responsive workspace dashboard and navigation
- Business website and prospecting-goal intake
- Searchable sample lead table and CSV export
- Clearly labelled illustrative data; no real contacts are fabricated and no email is sent

## Run locally
1. Install Node.js 18.17 or later.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open http://localhost:3000.

## Integrations still required
Live contact discovery, email verification, campaign sending, follow-ups, reply tracking, authentication, billing, and multi-tenant isolation are not yet implemented. Configure approved providers and secrets through Vercel environment variables, never commit secrets. Before sending outreach, implement sender authentication, unsubscribe, suppression lists, rate limits, and applicable privacy/marketing laws.

## Deploy
Import this repository into Vercel and use the default Next.js settings. Build command: `npm run build`.
