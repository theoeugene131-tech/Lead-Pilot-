# LeadPilot owner login and optional Supabase setup

## Owner login
The owner signs in with email and password using an independent signed session. Public account registration is disabled.

Set these server-side environment variables in Vercel for the Preview deployment before testing:
- `LEADPILOT_OWNER_EMAIL` (defaults to `tnwokobia@gmail.com`)
- `LEADPILOT_ACCESS_PASSWORD` (choose a strong private password)
- `LEADPILOT_SESSION_SECRET` (use a long, random secret; keep it private)

The session cookie is HttpOnly, Secure in production, SameSite=Strict, and expires after 12 hours. Never commit passwords or session secrets.

## Supabase
Supabase dependencies, client/server helpers, SQL migrations and cloud CRM implementation are retained for future use. Supabase is not required for owner sign-in. Cloud CRM sync still requires a configured Supabase project, its migrations, and a valid Supabase user/workspace session; it is not enabled by the independent owner login.

## AI lead qualification
Set `GEMINI_API_KEY` in Vercel Preview to enable the AI qualification endpoint. The default model is `gemini-2.5-flash`; `GEMINI_QUALIFICATION_MODEL` can override it.

## Other integrations
Set `HUNTER_API_KEY` for contact discovery and `RESEND_API_KEY` plus `RESEND_FROM_EMAIL` for email delivery, as required.

## Deployment checks
Run `npm install`, `npm run typecheck`, and `npm run build`. Test owner login, logout, protected page/API access, qualification with a valid Gemini key, and existing prospect discovery. Production must not be updated until Preview passes these checks and the owner approves the release.
