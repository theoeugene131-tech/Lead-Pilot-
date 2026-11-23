# LeadPilot Phase 1 authentication setup

This branch adds Supabase email/password accounts, session validation in middleware, protected API access, and authenticated email sending. The dashboard includes sign-out.

## Configure Supabase
1. Create a Supabase project and enable Email authentication.
2. Set Site URL to your deployed app URL.
3. Add redirect URLs for `https://YOUR-APP/auth/callback` and local `http://localhost:3000/auth/callback`.
4. Copy the Project URL and anon/public key.

## Configure Vercel
Set these environment variables for the environments you use:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `HUNTER_API_KEY` (if using Hunter)
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (if using email sending)

Never expose or add the Supabase service-role key to frontend variables.

## Security changes in this branch
- Middleware checks Supabase user sessions using `auth.getUser()` and blocks protected pages/API requests when unauthenticated.
- Legacy shared-password login is disabled.
- Email sending now requires a valid Supabase session; the old owner send-token header and dashboard token field have been removed.
- Email sends still require explicit approval in the request and keep the unsubscribe instruction check for non-test sends.
- Dashboard has a sign-out control.

## Important limitations
This is not yet a completed SaaS migration. Leads and discovered contacts are still saved in browser localStorage; no cloud sync or cross-device CRM exists yet. Workspace provisioning and database RLS policies need testing, and leads/companies/campaigns still need to be migrated into per-workspace Supabase storage.

## Before deployment
Run `npm install`, `npm run typecheck`, and `npm run build`. Test sign-up, email confirmation, sign-in, sign-out, protected page/API access, authenticated test email, and authenticated approved prospect email. These checks have not yet been run in this environment.
