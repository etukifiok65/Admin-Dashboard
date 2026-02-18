# 🐛 Admin Login Issue - ROOT CAUSE & FIX

## The Root Cause Found! ✅

**The Problem:**
```
admin_users table:  CHECK (role = 'admin') ← Only allows 'admin'
RLS Policy:         role IN ('super_admin', 'admin', 'moderator') ← Expects three roles
```

**What Was Happening:**
1. User tries to run: `npm run provision-admin user@example.com`
2. Script tries to insert with: `role = 'super_admin'`
3. Database CHECK constraint rejects it! ❌
4. Silent failure - record not created
5. User logs in, RLS policy blocks them ❌

## The Fix Applied ✅

Migration deployed: `20260218000200_fix_admin_roles_constraint.sql`

**Changed:**
- ❌ `CHECK (role = 'admin')` - Only 1 role allowed
- ✅ `CHECK (role IN ('super_admin', 'admin', 'moderator'))` - All 3 roles allowed

**Now all three dashboard roles work:**
1. **super_admin** - Full admin access, can manage other admins
2. **admin** - Admin access, limited management features
3. **moderator** - Limited access, content moderation only

## Fix Your Login Now (Updated)

### Step 1: Get SERVICE_ROLE_KEY
```
https://supabase.com/dashboard/project/spjqtdxnspndnnluayxp/settings/api
Copy: "service_role" key (starts with eyJh)
```

### Step 2: Set Environment Variable
```powershell
# Windows PowerShell
$env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"

# Then run the diagnostic to see current state:
node diagnose-login.js
```

### Step 3: Provision Your Superadmin
```bash
# Create super admin (full access)
npm run provision-admin your-email@example.com super_admin

# Or create regular admin:
npm run provision-admin another-email@example.com admin

# Or create moderator:
npm run provision-admin moderator@example.com moderator
```

### Step 4: Verify & Log In
```bash
npm run list-users              # See all users
npm run check-admin <token>     # Verify your role
# Then log in to dashboard
```

## All Three Roles Explained

| Role | Admin Access | Can Manage Users | Approval Powers |
|------|:---:|:---:|:---:|
| **super_admin** | ✅ Full | ✅ Yes | ✅ All |
| **admin** | ✅ Full | ✅ Limited | ✅ Most |
| **moderator** | ⚠️ Limited | ❌ No | ✅ Content only |

## Migration Details

**File:** `supabase/migrations/20260218000200_fix_admin_roles_constraint.sql`

**What it does:**
```sql
-- Drop old restrictive constraint
ALTER TABLE public.admin_users
DROP CONSTRAINT admin_users_role_check;

-- Add new constraint with all 3 roles
ALTER TABLE public.admin_users
ADD CONSTRAINT admin_users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'moderator'));
```

**Status:** ✅ Deployed to remote database

## Complete Workflow Now

```
1. Run: node diagnose-login.js
   ↓ Shows current admin_users status
   
2. Set SERVICE_ROLE_KEY environment variable
   ↓ Enables database access
   
3. Run: npm run provision-admin email@here.com super_admin
   ↓ Creates super admin record (role constraint now allows it)
   
4. Log in with that email
   ↓ RLS policy validates record exists
   ↓ RLS policy validates role is in allowed list ✅
   ↓ Authorization passes ✅
   
5. Dashboard loads and works
```

## Quick Commands Reference

```bash
# Diagnose current state
node diagnose-login.js

# List auth users
npm run list-users

# Create Super Admin (full access)
npm run provision-admin user@example.com super_admin

# Create Admin (full admin access)
npm run provision-admin user@example.com admin

# Create Moderator (limited access)
npm run provision-admin user@example.com moderator

# Verify admin status after provisioning
npm run check-admin <your-session-token>
```

## Why This Bug Existed

The original migration created a super-restrictive constraint:
```sql
role TEXT DEFAULT 'admin' CHECK (role = 'admin')
```

This only allowed the value 'admin'. But when the RLS hardening was added, it expected:
```sql
role IN ('super_admin', 'admin', 'moderator')
```

This mismatch was the silent blocker.

## How to Verify the Fix Works

After applying the migration:

```sql
-- Check constraint was updated
SELECT constraint_name, constraint_definition 
FROM information_schema.table_constraints 
WHERE table_name = 'admin_users' 
  AND constraint_name LIKE '%role%';

-- Should show: role IN ('super_admin', 'admin', 'moderator')
```

## Now You Can:

✅ Create super admin users  
✅ Create regular admin users  
✅ Create moderator users  
✅ All three roles are supported  
✅ RLS policies enforce access control  
✅ Login should work for all approved roles  

## What to Do Right Now

1. **Set SERVICE_ROLE_KEY:**
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="your-key"
   ```

2. **Run the diagnostic:**
   ```bash
   node diagnose-login.js
   ```

3. **Provision your super admin:**
   ```bash
   npm run provision-admin your-email@example.com super_admin
   ```

4. **Log in** - Should work now! 🎉

---

**The bug is fixed. The migration is deployed. Now provision your admin account and you're back online!**
