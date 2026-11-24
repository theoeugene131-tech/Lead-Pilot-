# LeadPilot owner login and Supabase setup

## Owner account
LeadPilot uses Supabase email/password authentication consistently for the dashboard and protected APIs. Public registration is not provided. The only permitted owner email is controlled by the server-side `LEADPILOT_OWNER_EMAIL` setting and defaults to:

`tnwokobia@gmail.com`

Create this user once in the Supabase project dashboard under Authentication > Users > Add user. Use the owner's email and a strong password chosen privately by the owner. If email confirmation is enabled, confirm the address before signing in. Never send the password or Supabase secret keys in chat or commit them to GitHub.

The login API only permits the configured owner email. The middleware refreshes and verifies Supabase sessions for protected pages and API routes. Logout revokes the Supabase session. The optional independent `LEADPILOT_ACCESS_PASSWORD` / `LEADPILOT_SESSION_SECRET` password gate is not used.

## Required Vercel environment
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LEADPILOT_OWNER_EMAIL` (optional; defaults to `tnwokobia@gmail.com`)

Do not configure or activate `LEADPILOT_ACCESS_PASSWORD` or `LEADPILOT_SESSION_SECRET`.

## Database
Apply the SQL migrations in `supabase/migrations` in their documented chronological order before relying on cloud CRM, workspace membership, API usage quotas, or email-send idempotency. The owner must have a default workspace created by the initial schema trigger. Cloud CRM stores a workspace-scoped JSON snapshot; keep regular CSV exports as an additional backup.

## AI lead qualification
Set `GEMINI_API_KEY` in Vercel to enable the AI qualification endpoint. The default model is `gemini-2.5-flash`; `GEMINI_QUALIFICATION_MODEL` can override it.

## Other integrations
Set `HUNTER_API_KEY` for contact discovery and `RESEND_API_KEY` plus `RESEND_FROM_EMAIL` for email delivery, as required.

## Deployment checks
Run `npm run typecheck` and `npm run build`. Verify owner login, email confirmation if enabled, session refresh, logout, protected page/API access, CRM read/write, lead discovery, qualification, and a controlled test email. Do not deploy to production until Preview passes these checks and the owner approves the release.
