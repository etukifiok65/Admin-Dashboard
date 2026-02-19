# Edge Function Deployment Guide

## Prerequisites

1. **Supabase CLI installed**
   
   Choose one installation method:
   
   **Scoop (Recommended for Windows):**
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```
   
   **Chocolatey:**
   ```powershell
   choco install supabase
   ```
   
   **npx (No installation):**
   Use `npx supabase` instead of `supabase` in all commands below.

2. **Authenticated with Supabase**
   ```powershell
   supabase login
   ```

3. **Project linked**
   ```powershell
   supabase link --project-ref spjqtdxnspndnnluayxp
   ```

## Quick Deploy (Recommended)

Run the automated deployment script:

```powershell
.\deploy-functions.ps1
```

This will deploy all admin functions:
- `list-admin-users`
- `list-audit-logs`
- `create-admin-user`
- `check-admin-status`

## Manual Deploy

If you prefer to deploy functions individually:

```powershell
# Deploy each function
supabase functions deploy list-admin-users
supabase functions deploy list-audit-logs
supabase functions deploy create-admin-user
supabase functions deploy check-admin-status
```

## Set Edge Function Secrets (Required)

After deploying, configure the server-side secrets:

```powershell
# Required secrets
supabase secrets set SUPABASE_URL=https://spjqtdxnspndnnluayxp.supabase.co
supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key-from-dashboard>

# Optional but recommended for production
supabase secrets set ALLOWED_ORIGINS=https://your-admin-dashboard.pages.dev,https://your-custom-domain.com
```

**Where to get SERVICE_ROLE_KEY:**
- Supabase Dashboard → Settings → API → Project API keys → `service_role` key

## Verify Deployment

1. **List deployed functions:**
   ```powershell
   supabase functions list
   ```

2. **Check function logs:**
   - Supabase Dashboard → Edge Functions → Select function → Logs

3. **Test from your deployed frontend:**
   - Login to your admin dashboard
   - Navigate to Settings → Admin Management
   - If admin users list loads, functions are working

## Cloudflare Pages Configuration

Set **only these environment variables** in Cloudflare Pages:

### Production Environment
- `VITE_SUPABASE_URL` = `https://spjqtdxnspndnnluayxp.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `<your-anon-key-from-dashboard>`
- `VITE_APP_NAME` = `HomiCareplus Admin` (optional)
- `VITE_APP_ENVIRONMENT` = `production` (optional)

### Preview Environment (same values as production)
- Same as above

**⚠️ NEVER set these in Cloudflare Pages:**
- `SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Any `VITE_*SERVICE_ROLE*` variable

## Troubleshooting

### "Origin not allowed" error
**Solution:** Set `ALLOWED_ORIGINS` secret with your frontend domains:
```powershell
supabase secrets set ALLOWED_ORIGINS=https://admin-dashboard.pages.dev,https://yourdomain.com
```

### "Server misconfiguration" error
**Solution:** Ensure `SERVICE_ROLE_KEY` is set in Edge Function secrets:
```powershell
supabase secrets set SERVICE_ROLE_KEY=<your-key>
```

### "Failed to send request" error
**Cause:** Functions not deployed or origin blocked
**Solution:** 
1. Run deployment script again
2. Check function logs for specific errors
3. Verify CORS/origin configuration

### Admin users list is empty but no error
**Cause:** Function invoked successfully but returned empty array
**Solution:** Check if admin_users table has records:
```sql
SELECT * FROM admin_users;
```

## Security Notes

✅ **Safe in frontend build (VITE_* variables):**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

❌ **MUST be server-side only (Edge Function secrets):**
- SERVICE_ROLE_KEY / SUPABASE_SERVICE_ROLE_KEY
- Never prefix service role key with `VITE_`

🔐 **Service role key gives full database access** - keep it secret, rotate it immediately if exposed in git history.

## Additional Resources

- [Supabase Edge Functions Documentation](https://supabase.com/docs/guides/functions)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/configuration/build-configuration/)
