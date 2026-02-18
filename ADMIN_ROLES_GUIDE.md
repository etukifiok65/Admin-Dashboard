# 👥 Admin Dashboard Roles Guide

## Three Admin Roles Available

After the bug fix, all three roles are now fully supported:

### 1. 🔴 **Super Admin** (Full Access)
```bash
npm run provision-admin user@example.com super_admin
```

**Permissions:**
- ✅ Access all admin features
- ✅ Manage other admin users
- ✅ Create/remove admins
- ✅ Approve all items
- ✅ View all analytics
- ✅ Change system settings
- ✅ Cannot be removed/downgraded by admins

**Best For:**
- System owner
- Executive/CEO
- Head of operations

**Example:**
```bash
npm run provision-admin ceo@company.com super_admin
```

---

### 2. 🟡 **Admin** (Full Admin Access)
```bash
npm run provision-admin user@example.com admin
```

**Permissions:**
- ✅ Access all admin features
- ✅ Approve most items
- ✅ View analytics
- ✅ Manage some settings
- ⚠️ Cannot manage other admins
- ⚠️ Cannot change critical settings

**Best For:**
- Department head
- Senior manager
- Administrator

**Example:**
```bash
npm run provision-admin admin@company.com admin
```

---

### 3. 🟢 **Moderator** (Limited Access)
```bash
npm run provision-admin user@example.com moderator
```

**Permissions:**
- ✅ Content moderation
- ✅ Approve user content
- ✅ View basic analytics
- ❌ No admin settings access
- ❌ Cannot manage users
- ❌ Cannot approve critical items

**Best For:**
- Content moderator
- Support specialist
- Community manager

**Example:**
```bash
npm run provision-admin moderator@company.com moderator
```

---

## How to Create Each Role

### Create Super Admin
```bash
# Set your key first
$env:SUPABASE_SERVICE_ROLE_KEY="your-key"

# Create super admin
npm run provision-admin ceo@example.com super_admin

# Verify
npm run check-admin <session-token>
```

### Create Admin
```bash
npm run provision-admin admin@example.com admin
```

### Create Moderator
```bash
npm run provision-admin moderator@example.com moderator
```

---

## Role Comparison Matrix

| Feature | Super Admin | Admin | Moderator |
|---------|:-----------:|:-----:|:---------:|
| **Access Dashboard** | ✅ | ✅ | ✅ |
| **View Analytics** | ✅ | ✅ | ⚠️ Limited |
| **Manage Users** | ✅ | ⚠️ Limited | ❌ |
| **Manage Admins** | ✅ | ❌ | ❌ |
| **Change Settings** | ✅ | ⚠️ Limited | ❌ |
| **Content Approval** | ✅ | ✅ | ✅ |
| **User Approval** | ✅ | ✅ | ❌ |
| **System Config** | ✅ | ❌ | ❌ |

---

## Quick Setup

### Step 1: Get Your Service Role Key
```
https://supabase.com/dashboard/project/spjqtdxnspndnnluayxp/settings/api
Copy: service_role key
```

### Step 2: Set Environment Variable
```powershell
# Windows PowerShell
$env:SUPABASE_SERVICE_ROLE_KEY="eyJh..."
```

### Step 3: Create Your First Super Admin
```bash
npm run provision-admin your-email@company.com super_admin
```

### Step 4: Log In
```
Go to dashboard and log in with your email
```

### Step 5: Create More Roles as Needed
```bash
# Add an admin
npm run provision-admin admin@company.com admin

# Add a moderator
npm run provision-admin mod@company.com moderator

# List all
npm run list-users
```

---

## Managing Roles

### List All Admin Users
```bash
npm run list-users
```

**Output:**
```
📋 Auth Users in the System:

1. Email: super@company.com
   Role: super_admin
   Active: ✅

2. Email: admin@company.com
   Role: admin
   Active: ✅

3. Email: mod@company.com
   Role: moderator
   Active: ✅
```

### Check Someone's Role
```bash
npm run check-admin <their-session-token>
```

**Output:**
```json
{
  "authenticated": true,
  "admin_exists": true,
  "is_active": true,
  "role": "super_admin"
}
```

### Change a Role (Admin Only)

Super admins can change roles by:
1. Logging into Supabase dashboard
2. Going to SQL Editor
3. Running:
```sql
UPDATE public.admin_users
SET role = 'admin'
WHERE email = 'user@company.com';
```

---

## Real-World Example

### Typical Setup for a Company

```bash
# CEO (Super Admin - runs company)
npm run provision-admin alice@company.com super_admin

# Head of Operations (Admin - manages day-to-day)
npm run provision-admin bob@company.com admin

# Department Heads (Admin - manage their departments)
npm run provision-admin carlos@company.com admin
npm run provision-admin diana@company.com admin

# Content Team (Moderators - approve content)
npm run provision-admin eva@company.com moderator
npm run provision-admin frank@company.com moderator
```

---

## Important Notes

### Once Created
- ✅ Roles take effect immediately
- ✅ User must log out/log in to see new permissions
- ✅ Roles are stored in Supabase admin_users table
- ✅ RLS policies enforce access control

### Changing Roles
- 🔒 Only super_admin can modify roles
- 📝 Changes require Supabase dashboard SQL access
- 🔄 User needs to log back in to see changes

### Removing Admins
```sql
-- Deactivate (disables but keeps record)
UPDATE public.admin_users
SET is_active = FALSE
WHERE email = 'user@company.com';

-- Or delete entirely
DELETE FROM public.admin_users
WHERE email = 'user@company.com';
```

---

## Troubleshooting Roles

### "Invalid role error"
```bash
# Valid roles only:
npm run provision-admin user@example.com super_admin  ✅
npm run provision-admin user@example.com admin        ✅
npm run provision-admin user@example.com moderator    ✅

# These won't work:
npm run provision-admin user@example.com owner        ❌
npm run provision-admin user@example.com user         ❌
```

### "Role not updating"
1. Make sure you're a super_admin (highest role)
2. Use Supabase SQL editor to update:
   ```sql
   UPDATE public.admin_users
   SET role = 'admin'
   WHERE email = 'user@example.com';
   ```
3. User must log out and back in

### "Can't see new permissions"
1. Log out of dashboard
2. Log back in
3. Browser cache? Clear it (Ctrl+Shift+Delete)
4. Check Supabase logs for RLS errors

---

## Database Schema

The three roles are backed by:

**admin_users table:**
```sql
role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'moderator'))
```

**RLS Policies:**
```sql
-- Admins can read if they have a valid role
WHERE actor.role IN ('super_admin', 'admin', 'moderator')
  AND actor.is_active = TRUE
```

---

## Next Steps

1. ✅ Create your first super admin
2. ✅ Log in and verify access
3. ✅ Create team members with appropriate roles
4. ✅ Monitor Supabase logs
5. ✅ Adjust roles as needed

---

**All three roles are now fully operational. Build your admin team!** 🚀
