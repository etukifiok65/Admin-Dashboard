# Admin Users RLS Fix Guide
# This explains why super admin login is failing and how to fix it

## Problem Analysis

The new RLS hardening migration (20260218000100_harden_admin_users_rls.sql) added a strict policy:

```sql
CREATE POLICY "Admins can read admin users"
  ON public.admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users AS actor
      WHERE actor.auth_id = auth.uid()
        AND actor.is_active = TRUE
        AND actor.role IN ('super_admin', 'admin', 'moderator')
    )
  );
```

This means: **An authenticated user can only query admin_users if they have their own record in admin_users with role='super_admin'|'admin'|'moderator' AND is_active=TRUE**

If the user exists in `auth.users` but NOT in `admin_users`, the RLS policy blocks access.

## Root Cause

The user is authenticated (exists in auth.users) but has no corresponding record in admin_users table, OR the record's `is_active` is FALSE or `role` is not in the allowed list.

## Solution

### Option A: Create an admin record for an existing auth user (Recommended for First Setup)

1. Go to Supabase Dashboard → SQL Editor
2. Run this query with your auth user's email and ID:

```sql
-- First, get your auth user ID
SELECT id, email FROM auth.users LIMIT 5;

-- Then insert an admin_users record (replace the values)
INSERT INTO public.admin_users (auth_id, email, name, role, is_active)
VALUES (
  'YOUR_AUTH_USER_ID_HERE',  -- UUID from auth.users
  'your-email@example.com',   -- Email address
  'Your Name',                -- Full name
  'super_admin',              -- Role: 'super_admin', 'admin', or 'moderator'
  TRUE                        -- Must be TRUE
)
ON CONFLICT (auth_id) DO UPDATE SET
  is_active = TRUE,
  role = 'super_admin',
  updated_at = NOW();
```

### Option B: Use the create-admin-user Edge Function (For Adding More Admins)

This function already exists and includes CORS/auth validation:

```bash
curl -X POST https://spjqtdxnspndnnluayxp.supabase.co/functions/v1/create-admin-user \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "super_admin"
  }'
```

### Option C: Direct SQL via Supabase CLI (Recommended for Development)

```bash
# Using Supabase CLI to run SQL directly
supabase db execute --sql "
  INSERT INTO public.admin_users (auth_id, email, name, role, is_active)
  SELECT id, email, split_part(email, '@', 1), 'super_admin', TRUE
  FROM auth.users
  WHERE email = 'your-email@example.com'
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_id = auth.users.id
    );
"
```

## Verification

After creating the admin record, use the diagnostic function:

```bash
node check-admin.js YOUR_SESSION_TOKEN
```

Or test directly:

```bash
curl -X GET https://spjqtdxnspndnnluayxp.supabase.co/functions/v1/check-admin-status \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

Expected response when fixed:
```json
{
  "authenticated": true,
  "user_id": "...",
  "user_email": "...",
  "admin_exists": true,
  "is_active": true,
  "role": "super_admin"
}
```

## Impact on Other Features

The RLS policy is now enforcing:
- ✅ Admins can only see and modify admin_users records they're authorized for
- ✅ Unauthenticated users cannot access admin_users
- ✅ Users without an admin_users record cannot proceed (intentional security gate)
- ⚠️ All admin dashboard features require a valid admin_users record

## Rollback (if needed)

If you need to revert the stricter RLS temporarily for debugging:

```sql
-- Temporary: Allow authenticated users to view their own record only
DROP POLICY IF EXISTS "Admins can read admin users" ON public.admin_users;
CREATE POLICY "Admin can view own profile only"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());
```

Then re-apply the hardened policy after fixing the data.

## Summary of Changes by Migration

| Migration | Change | Impact |
|-----------|--------|--------|
| 20260213000200_create_admin_users.sql | Initial admin_users table | Allows admin management |
| 20260218000100_harden_admin_users_rls.sql | **Add role-based RLS policies** | **⚠️ Requires admin_users record to exist** |

The hardening migration is the cause of the login failure. It's working as designed - it's preventing access until the user is properly registered as an admin.
