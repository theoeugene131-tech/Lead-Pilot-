# LeadPilot AI

LeadPilot AI is a prospect research and outreach workspace built with Next.js.

## Current functionality
- Responsive dashboard and workspace navigation.
- Public company website analysis through `POST /api/analyze`.
- Extracts public homepage title, description and headings, then suggests an initial customer segment and decision-maker roles.
- Hunter-powered company discovery through `POST /api/discover` using a natural-language target-market description.
- Opt-in Hunter Domain Search through `POST /api/contacts` to retrieve professional contact details for a selected company. This can consume provider credits.
- Search and CSV export for real contacts retrieved from selected companies.

## Configure Hunter
1. Create or sign in to a Hunter account at https://hunter.io/.
2. Generate an API key in your Hunter account.
3. In your Vercel project, open Settings → Environment Variables.
4. Add `HUNTER_API_KEY` with your private API key. Enable it for the Production environment (and Preview if needed).
5. Redeploy the project after adding the variable.

For local development, copy `.env.example` to `.env.local` and add the key there. Never commit a real API key to GitHub.

Hunter Discover access and email lookup limits depend on the Hunter account plan and available credits. Discover finds companies; Domain Search is a separate, credit-consuming step to retrieve professional email addresses. Review the provider's pricing and terms before use.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Current limitations
- Website analysis is a lightweight public-homepage parser, not a full AI business analysis.
- Hunter Discover returns matching companies and estimated email counts; contact details are retrieved only when the user explicitly selects a company and requests a contact search.
- A protected, owner-approved single-email send endpoint is available through Resend once provider credentials and a verified sender domain are configured. It is not a bulk campaign system.
- Scheduled sequences, follow-ups, inbox/reply tracking, persistent campaign records, full user authentication, billing, and multi-tenant account separation are not implemented yet.
- The sample contacts are fictional placeholders using reserved `.invalid` email domains. They are not real contacts.

## Production safeguards still required
Before offering this as a multi-client SaaS, implement authentication and tenant isolation, persistent storage, provider usage limits and audit logs. For outreach, add human approval before sends, sender authentication, unsubscribe links, suppression lists, bounce handling, rate limits, and applicable privacy-law checks (including Nigeria's NDPA where relevant). Do not send unsolicited bulk email.


## Cloud database foundation (Supabase)

The canonical starter multi-workspace schema is `supabase/migrations/202611070001_initial_schema.sql`. It creates workspaces and memberships, companies, leads, draft campaigns, email suppression records, and outreach event history. Row Level Security policies scope records to a user's workspace. New Supabase Auth users automatically receive a private default workspace. The file `202611210001_initial_saas_schema.sql` is intentionally a no-op because it was a conflicting earlier draft; do not run it.

To activate this database foundation:
1. Create a Supabase project at https://supabase.com/.
2. Open the project's SQL Editor.
3. Open the migration file in this repository, copy its complete SQL, paste it into SQL Editor, and run it.
4. Keep the Supabase project URL and anon/publishable key private to your deployment environment; never commit service-role keys.
5. The current dashboard still uses browser storage for discovered results. The schema is a foundation and is not yet wired into the dashboard or authentication flow.

Do not invite customers or store production personal data until the Supabase migration has run and the app's authenticated database integration has been implemented and tested.

## Configure the first approved email send

1. Create a Resend account at https://resend.com/ and add the business sending domain.
2. Complete the DNS verification records Resend provides with the domain's DNS host. Do not send until Resend marks the domain verified and the mailbox owner has authorised its use.
3. Create a Resend API key.
4. In Vercel → Project Settings → Environment Variables, add:
   - `RESEND_API_KEY`: the private Resend API key.
   - `RESEND_FROM_EMAIL`: the full verified sender address (for example, `operations@yourdomain.com`).
   - `LEADPILOT_SEND_TOKEN`: a long, unique random secret used to approve sending from the dashboard.
5. Redeploy after adding the variables.

The first sending workflow sends one reviewed email at a time, requires explicit confirmation and a private owner token, and requires an unsubscribe instruction in the message. It does not yet provide bulk campaigns, scheduling, follow-ups, reply tracking, durable suppression lists, or complete authentication/rate limiting. Keep the dashboard private while this initial workflow is being tested. Only contact people where you have an appropriate lawful basis and respect opt-outs and provider terms.
