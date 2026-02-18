# Quick Start: Fix Your Admin Login

## TL;DR - 3 Commands to Fix Everything

```bash
# 1. Find your email in the auth system
npm run list-users

# 2. Make it admin (copy your email from step 1)
npm run provision-admin YOUR_EMAIL_HERE

# 3. You're done! Log in again
```

## Prerequisites

You need your Supabase SERVICE_ROLE_KEY. Get it from:
https://supabase.com/dashboard/project/spjqtdxnspndnnluayxp/settings/api

### Set the Key (Choose One)

**Windows PowerShell:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="eyJh... (paste your key here)"
```

**Windows Command Prompt:**
```cmd
set SUPABASE_SERVICE_ROLE_KEY=eyJh... (paste your key here)
```

**Linux/Mac:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="eyJh... (paste your key here)"
npm run list-users
```

## What These Commands Do

### `npm run list-users`
Shows all auth users. Find your email here.

**Example output:**
```
📋 Auth Users in the System:

1. Email: admin@example.com
   ID: 550e8400-e29b-41d4-a716-446655440000
   Created: 2025-02-18T10:00:00Z
   Status: ✅ Confirmed

2. Email: user@example.com
   ID: 660e8400-e29b-41d4-a716-446655440001
   Created: 2025-02-18T11:00:00Z
   Status: ✅ Confirmed

Next steps:
  1. Copy an email from above
  2. Run: npm run provision-admin <email>
     Example: npm run provision-admin admin@example.com
```

### `npm run provision-admin user@example.com`
Creates the admin_users record that the RLS policy requires.

**Example output:**
```
====================================
  Admin User Provisioning Script
====================================

✅ Using email: admin@example.com

Step 2: Connecting to Supabase...
─────────────────────────────
✅ Connected to Supabase

Step 3: Finding auth user: admin@example.com
─────────────────────────
✅ Found user: 550e8400-e29b-41d4-a716-446655440000
   Email confirmed: Yes

Step 4: Creating admin_users record...
─────────────────────────────
✅ Admin record created/updated

========================================
  ✨ SUCCESS!
========================================

admin@example.com is now a SUPER ADMIN

Next steps:
  1. Log in to the dashboard with: admin@example.com
  2. You should now have full admin access
```

### `npm run check-admin <token>`
Verifies the admin_users record exists and is active.

Get `<token>`:
1. Log in to your app
2. Open browser DevTools (F12)
3. Go to Application → Local Storage
4. Find `sb-XXXXX-auth-token`
5. Copy the entire value

**Example output (success):**
```json
{
  "authenticated": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_email": "admin@example.com",
  "admin_exists": true,
  "is_active": true,
  "role": "super_admin"
}
```

**Example output (failed - before provisioning):**
```json
{
  "authenticated": true,
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_email": "admin@example.com",
  "admin_exists": false,
  "error": "User not found in admin_users table"
}
```

## Troubleshooting

**Problem:** "SUPABASE_SERVICE_ROLE_KEY not set"
```
$env:SUPABASE_SERVICE_ROLE_KEY="your-key"
npm run list-users
```

**Problem:** "User not found: you@example.com"
- First, sign up on your login page
- Then run the provision-admin command

**Problem:** "Still getting 'not an admin' error"
- Run: `npm run check-admin <token>`
- This tells you exactly what's wrong

## Done?

✅ If ADMIN_EXISTS shows true and role shows super_admin:
1. Refresh your dashboard
2. You should have full admin access
3. Done! 🎉

For full troubleshooting, see: **ADMIN_LOGIN_FIX.md**
