# LeadPilot owner login and Supabase setup

## Independent owner login

LeadPilot owner login does not use Supabase. The only permitted owner email is controlled by the server-side `LEADPILOT_OWNER_EMAIL` setting and defaults to:

`tnwokobia@gmail.com`

Set these server-only environment variables in Vercel for the Preview environment first:

- `LEADPILOT_OWNER_EMAIL` — optional; defaults to `tnwokobia@gmail.com`
- `LEADPILOT_ACCESS_PASSWORD` — choose a long, unique password for the LeadPilot owner account
- `LEADPILOT_SESSION_SECRET` — a random secret of at least 32 characters, used to sign 12-hour HttpOnly owner sessions

Keep both secrets private. Do not put them in client-side variables, send them in chat, or commit real values to GitHub. If either required secret is missing or invalid, owner login fails closed. The session cookie is HttpOnly, SameSite=Strict and Secure in production. There is no public registration.

Changing `LEADPILOT_SESSION_SECRET` invalidates existing owner sessions, so the owner must sign in again.

## Supabase remains available for cloud services

Supabase has not been removed. Its client libraries, server helper, schema and migrations remain in the project for future workspace-scoped cloud CRM.

These features still depend on a configured Supabase project and database migrations:

- Cloud CRM read/write and workspace membership.
- Usage quotas for Hunter discovery, contact lookup, Snov email reveal and Gemini qualification.
- Prospect-email suppression checks, do-not-contact checks and duplicate-send protection.

Without Supabase, LeadPilot can still authenticate the owner independently, analyse a public company website, prepare email drafts, save prospect workspace data in the browser and export available contact data. Provider-backed actions protected by the Supabase quota system fail closed rather than making unmetered paid API calls.

A test email to the owner's own address can use the independent owner session and Resend configuration. Sending an email to a prospect remains blocked until the cloud CRM authentication/workspace checks are available. Do not remove these checks merely to enable sending.

## Other environment variables

- `GEMINI_API_KEY` — enables AI qualification after the Supabase-backed usage quota is available.
- `GEMINI_QUALIFICATION_MODEL` — optional; defaults to `gemini-2.5-flash`.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required for cloud CRM and Supabase-backed quota checks, not owner login.
- `HUNTER_API_KEY` — company and contact discovery provider.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` — test email and, when cloud safeguards are available, prospect email delivery.
- `SNOV_API_USER_ID` and `SNOV_API_SECRET` — optional Snov.io email reveal integration.

## Database

Apply the SQL migrations in `supabase/migrations` in their documented chronological order before relying on cloud CRM, workspace membership, API usage quotas, or email-send idempotency. The owner must have a default workspace created by the initial schema trigger. Keep regular CSV exports as an additional backup.

## Deployment and verification

Set the owner secrets in Vercel Preview, redeploy the Preview, and verify:

1. The owner can sign in with the configured email and password when Supabase variables are absent.
2. An incorrect email or password is rejected.
3. Protected pages and API routes reject requests without a valid owner session.
4. Logout clears the owner session.
5. Website analysis, browser-local saving and CSV export work.
6. Supabase-dependent cloud and paid-provider actions report a clear configuration/quota message when Supabase is absent.
7. A test email goes only to the owner's own address.

Run `npm run typecheck` and `npm run build`. Do not merge or deploy to production until Preview passes and the owner explicitly approves release.
