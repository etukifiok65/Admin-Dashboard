# Security Rollout Checklist

This checklist applies the recent security hardening safely in production.

## 1) Supabase migration apply order

Current migration file in this repo:
- `supabase/migrations/20260218000100_harden_admin_users_rls.sql`

### Prerequisites
- Supabase CLI installed (`supabase --version`)
- Supabase access token configured (`supabase login`)
- Project ref available (from Supabase dashboard)

### Commands (PowerShell)
```powershell
# 1) From repo root
Set-Location "C:\Users\HP\Repositories\Admin-Dashboard"

# 2) Link this workspace to your Supabase project
supabase link --project-ref <YOUR_PROJECT_REF>

# 3) Apply pending migrations in timestamp order
supabase db push

# 4) Verify migration state
supabase migration list
```

Expected result:
- `20260218000100_harden_admin_users_rls.sql` appears as applied.

## 2) Configure edge function secrets (strict CORS)

Set these secrets for the Supabase project:

```powershell
supabase secrets set SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
supabase secrets set SERVICE_ROLE_KEY=<YOUR_SERVICE_ROLE_KEY>
supabase secrets set ALLOWED_ORIGINS="https://admin.yourdomain.com,https://staging-admin.yourdomain.com,http://localhost:3000"
```

Notes:
- Use exact origins only (scheme + hostname + optional port).
- No trailing slashes in `ALLOWED_ORIGINS`.
- `SUPABASE_SERVICE_ROLE_KEY` is still supported, but `SERVICE_ROLE_KEY` is preferred.

## 3) Deploy edge functions

```powershell
supabase functions deploy create-admin-user
supabase functions deploy list-admin-users
```

## 4) Validate CORS behavior

- Allowed origins: requests succeed.
- Non-allowlisted origins: receive `403 Origin not allowed`.
- OPTIONS preflight responds with allowed methods/headers.

## 5) CSP enforcement switch (after report-only validation)

Current state:
- `public/_headers` uses `Content-Security-Policy-Report-Only`.
- Enforce template exists at `public/_headers.csp-enforce-template`.

### Switch to enforced CSP
```powershell
Copy-Item .\public\_headers.csp-enforce-template .\public\_headers -Force
```

Then deploy your frontend.

## 6) Post-deploy smoke tests

- Admin login/logout works.
- Admin users list/create works (super admin only).
- Admin update/toggle behavior follows RLS policy.
- Dashboard pages load without blocked critical assets/scripts.

## 7) Rollback plan

- CSP: restore previous `public/_headers` from git history and redeploy.
- Edge functions: redeploy prior known-good function version.
- Database: if policy rollback is needed, apply a compensating SQL migration (do not edit applied migration in place).
