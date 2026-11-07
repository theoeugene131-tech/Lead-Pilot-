# LeadPilot AI

LeadPilot AI is a prospect research and outreach workspace built with Next.js.

## Current functionality
- Responsive dashboard and workspace navigation.
- Company website analysis through `POST /api/analyze`.
- Extracts public homepage title, description and headings.
- Produces initial customer-segment and decision-maker suggestions from website content.
- Search and CSV export for the clearly labelled illustrative sample records.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Current limitations
The website analyzer is an initial research aid, not an AI model or a live lead database. The sample contacts are fictional placeholders using reserved `.invalid` email domains. No real people or email addresses are fabricated. Live prospect discovery, professional email enrichment/verification, user accounts, persistent lead storage, sending, replies and analytics are not enabled yet.

## Before enabling live prospecting or email
Connect a licensed business-data/search provider and an email verification provider. Add authentication and tenant isolation, then connect a transactional email provider. Store all API keys only in deployment environment variables, never in Git. Require human approval before sending, and implement consent/lawful-basis review, sender authentication, unsubscribe links, suppression lists, bounce handling, rate limits and audit logs.

## Security
The website analysis endpoint only accepts public HTTP(S) pages, blocks local/private IP destinations, refuses redirects and applies a request timeout. Review and harden this endpoint before production use.
