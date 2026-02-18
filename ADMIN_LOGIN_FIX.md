# Admin Login Fix - Complete Troubleshooting Guide

## Problem Summary

After deploying the security hardening migration, super admin login fails with:
```
Authentication Failed: User is not an admin
```

## Root Cause

The new RLS policy requires that **every authenticated user must have a record in the `admin_users` table** to access any admin features.

**The failing policy:**
```sql
CREATE POLICY "Admins can read admin users"
  ON public.admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users AS actor
      WHERE actor.auth_id = auth.uid()
        AND actor.is_active = TRUE
        AND actor.role IN ('super_admin', 'admin', 'moderator')
    )
  );
```

**Why it fails:**
- User is authenticated ✅ (exists in `auth.users`)
- User is NOT in `admin_users` table ❌
- RLS policy blocks access → "User is not an admin"

## Solution: 3 Steps to Fix

### Step 1: Verify You Have an Auth Account

```bash
npm run list-users
```

This shows all auth users. If you don't see your email, you need to create an account:
1. Go to your app's login page
2. Sign up with an email
3. Confirm your email if required

### Step 2: Provision Your Account as Admin

```bash
# Option A: Interactive (you get prompted)
npm run provision-admin

# Option B: Direct (specify email)
npm run provision-admin user@example.com
```

**What this does:**
- Finds your auth user
- Creates an `admin_users` record with `role='super_admin'`
- Sets `is_active=TRUE`

### Step 3: Test Login

1. Log in with your email
2. You should now see the admin dashboard
3. If it still fails, run:
   ```bash
   npm run check-admin <your-session-token>
   ```

## Implementation Details

### What the Fix Scripts Do

#### `setup-admin.js` (npm run provision-admin)
1. Accepts auth user email as argument or prompts for it
2. Connects to Supabase using SERVICE_ROLE_KEY
3. Finds the auth user by email
4. Inserts/updates admin_users record:
   - `auth_id` → links to auth.users
   - `role` → 'super_admin'
   - `is_active` → TRUE
   - `email` → your account email
   - `name` → derived from email

#### `check-admin.js` (npm run check-admin)
1. Takes session token as argument
2. Calls the `check-admin-status` edge function
3. Shows:
   - ✅ If user is authenticated
   - ✅ If admin_users record exists
   - ✅ If record is active
   - ✅ What role is assigned

#### `list-users.js` (npm run list-users)
1. Lists all auth users in your Supabase project
2. Shows email, ID, creation date, confirmation status
3. Helps you identify which email to provision

### Edge Functions Created

**check-admin-status**
- Diagnostic function
- Takes authorization header (session token)
- Returns admin status WITHOUT RLS enforcement (uses SERVICE_ROLE_KEY)
- Helps debug why login fails

Location: `supabase/functions/check-admin-status/index.ts`

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY not set"

**Fix:** Set the environment variable

Windows (PowerShell):
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"
npm run provision-admin
```

Windows (Command Prompt):
```cmd
set SUPABASE_SERVICE_ROLE_KEY=your-key-here
npm run provision-admin
```

Linux/Mac:
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
npm run provision-admin
```

**Where to find the key:**
1. Go to: https://supabase.com/dashboard/project/spjqtdxnspndnnluayxp/settings/api
2. Look for "service_role" (not "anon")
3. It starts with `eyJh`

### "User not found: user@example.com"

**Fix:** Create an auth account first
1. Open your app's login page
2. Click "Sign up"
3. Enter the email
4. Confirm email if required
5. Then run: `npm run provision-admin user@example.com`

### "Still getting 'not an admin' error after provisioning"

**Diagnostic steps:**

1. **Check admin record exists:**
   ```bash
   npm run check-admin <your-token>
   ```

2. **Manually verify in Supabase Console:**
   - Go to SQL Editor
   - Run:
     ```sql
     SELECT * FROM admin_users WHERE email = 'your@email.com';
     ```

3. **Check auth user ID matches:**
   ```sql
   SELECT id FROM auth.users WHERE email = 'your@email.com';
   -- Compare with admin_users.auth_id
   ```

4. **Verify RLS policy exists:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'admin_users';
   ```

### "check-admin shows admin_exists=false"

**The issue:** The admin_users record wasn't created successfully

**Fix:** 
1. Check that `npm run provision-admin` ran without errors
2. Verify SERVICE_ROLE_KEY is correct (try running `npm run list-users`)
3. Manually insert the record:
   ```bash
   supabase db execute --sql "
   INSERT INTO public.admin_users (auth_id, email, name, role, is_active)
   SELECT id, email, SPLIT_PART(email, '@', 1), 'super_admin', TRUE
   FROM auth.users WHERE email = 'your@example.com'
   ON CONFLICT (auth_id) DO UPDATE SET is_active = TRUE, role = 'super_admin';
   "
   ```

## RLS Policy Explained

The hardened RLS policy works like this:

```
┌─────────────────────────────────────────────────┐
│ User tries to read admin_users table            │
└─────────────────────────────────────────────────┘
                        ↓
         ┌──────────────────────────────┐
         │ Check RLS SELECT policy       │
         └──────────────────────────────┘
                        ↓
         ┌──────────────────────────────┐
         │ Does user have auth session? │ NO → ❌ Reject (401)
         └──────────────────────────────┘
                 ↓ YES
         ┌──────────────────────────────┐
         │ Is user in admin_users table?│ NO → ❌ Reject (403)
         └──────────────────────────────┘ 
                 ↓ YES
         ┌──────────────────────────────────┐
         │ Is record is_active = TRUE?      │ NO → ❌ Reject (403)
         └──────────────────────────────────┘
                 ↓ YES
         ┌──────────────────────────────────┐
         │ Is role in allowed list?         │ NO → ❌ Reject (403)
         │ ('super_admin', 'admin',         │
         │  'moderator')                    │
         └──────────────────────────────────┘
                 ↓ YES
                ✅ ALLOW
```

## Recovery: Reverting the RLS Hardening

If you need to temporarily revert to allow debugging:

```sql
-- Temporary: Allow any authenticated user to view admin_users
DROP POLICY IF EXISTS "Admins can read admin users" ON public.admin_users;
CREATE POLICY "authenticated_can_read"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- Later: Re-apply strict policy
DROP POLICY IF EXISTS "authenticated_can_read" ON public.admin_users;
CREATE POLICY "Admins can read admin users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users AS actor
      WHERE actor.auth_id = auth.uid()
        AND actor.is_active = TRUE
        AND actor.role IN ('super_admin', 'admin', 'moderator')
    )
  );
```

## Quick Reference

| Task | Command |
|------|---------|
| List all auth users | `npm run list-users` |
| Make user admin | `npm run provision-admin <email>` |
| Check admin status | `npm run check-admin <token>` |
| Set SERVICE_ROLE_KEY | See "SUPABASE_SERVICE_ROLE_KEY not set" section |

## Files Created

- `setup-admin.js` - CLI tool to provision admins
- `check-admin.js` - CLI tool to verify admin status
- `list-users.js` - CLI tool to list auth users
- `ADMIN_RLS_FIX.md` - Original fix documentation
- `supabase/functions/check-admin-status/` - Diagnostic edge function

## Testing Checklist

After provisioning:

- [ ] User can log in without "not admin" error
- [ ] Dashboard loads
- [ ] Can access admin features
- [ ] Check-admin script shows `admin_exists: true`
- [ ] Check-admin script shows `is_active: true`
- [ ] Check-admin script shows `role: super_admin`

## Next Steps

Once login is working:

1. Test other admin features
2. Add more admins with lower roles ('admin', 'moderator')
3. Monitor logs for RLS violations
4. Keep SERVICE_ROLE_KEY secure (don't commit to git)

## Questions?

If the above doesn't work, check:
1. Is SUPABASE_SERVICE_ROLE_KEY really set? (`echo $SUPABASE_SERVICE_ROLE_KEY`)
2. Is it the correct key? (starts with `eyJh`)
3. Has the migration been deployed? (`supabase migration list` should show `20260218000100`)
4. Check Supabase dashboard for any errors in the SQL logs
