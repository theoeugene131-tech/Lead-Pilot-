# LeadPilot Phase 1 authentication setup

This branch adds Supabase email/password auth and middleware session checks. It is not yet a finished SaaS migration: CRM leads are still browser-local, and email sending is still using the legacy send-token flow pending a separate migration.

## Configure Supabase
1. Create a Supabase project and enable Email authentication.
2. Set Site URL to your deployed app URL.
3. Add redirect URLs for `https://YOUR-APP/auth/callback` and local `http://localhost:3000/auth/callback`.
4. Copy the Project URL and anon/public key.

## Configure Vercel
Set these environment variables for the environments you use:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Never expose or add the service-role key to frontend variables.

## Before deployment
Run `npm install`, `npm run typecheck`, and `npm run build`. Test account creation, email confirmation, sign-in, sign-out, protected page/API access. This environment has no build runner, so those checks have not been performed.

## Remaining Phase 1 work
- Review and test workspace provisioning and RLS SQL.
- Move lead/company/campaign data from browser storage into Supabase per-user workspaces.
- Replace legacy send-token UI/API with authenticated-session authorization.
- Verify logout UI integration and API coverage.
