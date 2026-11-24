# LeadPilot owner login and Supabase setup

## Independent owner login

LeadPilot owner login is independent of Supabase. The permitted owner email is controlled by the server-side `LEADPILOT_OWNER_EMAIL` setting and defaults to `tnwokobia@gmail.com`.

Set these server-only variables in Vercel Preview first:

- `LEADPILOT_OWNER_EMAIL` — optional; defaults to `tnwokobia@gmail.com`.
- `LEADPILOT_ACCESS_PASSWORD` — a long, unique password chosen privately by the owner.
- `LEADPILOT_SESSION_SECRET` — a random secret of at least 32 characters used to sign 12-hour owner sessions.

Keep both secrets private. Do not use client-side `NEXT_PUBLIC_` variables for them, send them in chat, or commit real values to GitHub. Login fails closed if either required secret is missing. The session cookie is HttpOnly, SameSite=Strict and Secure in production. There is no public registration. Changing the session secret invalidates existing sessions.

## Supabase remains available for cloud services

Supabase has not been removed. Its client libraries, server helper, schema and migrations remain for future workspace-scoped cloud CRM.

These features still depend on Supabase and its database migrations:

- Cloud CRM read/write and workspace membership.
- Usage quotas for Hunter discovery, contact lookup, Snov email reveal and Gemini qualification.
- Prospect-email suppression checks, do-not-contact checks and duplicate-send protection.

Without Supabase, the owner can still sign in independently, analyse a public company website, prepare email drafts, save prospect workspace data in the browser and export available contact data. Paid-provider actions protected by the Supabase quota system fail closed rather than making unmetered API calls.

A test email to the owner's own address can use the independent owner session and Resend configuration. Prospect email sending remains blocked until cloud CRM authentication and workspace checks are available. Do not remove these safeguards merely to enable sending.

## Other environment variables

- `GEMINI_API_KEY` enables AI qualification after the Supabase-backed usage quota is available.
- `GEMINI_QUALIFICATION_MODEL` is optional; default is `gemini-2.5-flash`.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are required for cloud CRM and Supabase-backed quotas, not owner login.
- `HUNTER_API_KEY` enables company and contact discovery.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` enable test email and, when cloud safeguards are available, prospect email delivery.
- `SNOV_API_USER_ID` and `SNOV_API_SECRET` are optional Snov.io credentials.

## Database

Apply the SQL migrations in `supabase/migrations` in documented chronological order before relying on cloud CRM, workspace membership, usage quotas or email-send idempotency. Keep regular CSV exports as an additional backup.

## Deployment and verification

Set the owner secrets in Vercel Preview and redeploy the Preview. Verify that owner login works when Supabase variables are absent; incorrect credentials are rejected; protected pages and APIs reject requests without a valid owner session; logout clears the session; website analysis, browser-local saving and CSV export work; Supabase-dependent actions fail with clear messages when Supabase is absent; and a test email goes only to the owner's own address.

Run `npm run typecheck` and `npm run build`. Do not merge or deploy to production until Preview passes and the owner explicitly approves release.
