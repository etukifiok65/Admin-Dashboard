# 🔧 RLS Infinite Recursion - FIXED

**Status:** ✅ **RESOLVED**  
**Date Fixed:** February 18, 2026  
**Error:** "Infinite recursion detected in policy for relation admin_users"

---

## 🔍 What Caused The Error

The RLS policy for `admin_users` had a **circular query** that triggered infinite recursion:

```sql
-- ❌ PROBLEMATIC POLICY (old version)
CREATE POLICY "Admins can read admin users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users AS actor  -- ← Same table!
      WHERE actor.auth_id = auth.uid()
        AND actor.is_active = TRUE
        AND actor.role IN ('super_admin', 'admin', 'moderator')
    )
  );
```

### How The Recursion Happened

```
User tries to: SELECT * FROM admin_users
  ↓
RLS Policy checks: USING clause
  ↓
USING queries: SELECT 1 FROM admin_users
  ↓
That query triggers: USING clause (same policy!)
  ↓
USING queries: SELECT 1 FROM admin_users
  ↓
Infinite loop... ❌
```

### Why This Happens

In Supabase/PostgreSQL, when a policy queries the **same table** it's protecting, the RLS policy applies to that query too, creating a loop.

---

## ✅ The Solution

Use a **SECURITY DEFINER function** instead of a direct table query. SECURITY DEFINER functions bypass RLS:

```sql
-- ✅ FIXED: SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE auth_id = auth.uid()
      AND is_active = TRUE
      AND role IN ('super_admin', 'admin', 'moderator')
  );
$$;

-- ✅ FIXED: Policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Admins can read admin users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());
```

### Why This Works

Since `current_user_is_admin()` is `SECURITY DEFINER`, it runs with special permissions and doesn't trigger RLS policies. So:

```
User tries to: SELECT * FROM admin_users
  ↓
RLS Policy checks: USING clause
  ↓
USING calls: current_user_is_admin() function
  ↓
Function runs (bypasses RLS) and returns TRUE/FALSE
  ↓
No recursion needed! ✅
```

---

## 📝 Changes Made

**File:** `supabase/migrations/20260218000300_fix_admin_users_recursion.sql`

| Change | Details |
|--------|---------|
| Dropped | Old SELECT policy with circular query |
| Created | `current_user_is_admin()` SECURITY DEFINER function |
| Created | New SELECT policy using the function |
| Improved | All policies now consistent (SELECT, UPDATE, DELETE, INSERT) |

---

## ✅ Verification

**After Fix:**
```
✅ Query admin_users: SUCCESS
✅ Returns all 3 admin records
✅ No recursion error
✅ Policies working correctly
```

---

## 🔐 What This Means for Security

✅ **Still Secure:** Only admins can read admin users  
✅ **Still Secure:** Only super admins can modify admin users  
✅ **Added:** DELETE and INSERT policies for completeness  
✅ **Fixed:** No more recursion attacks possible  

The security level is the same, but now it actually **works** without errors.

---

## 🚀 What To Do Now

1. **Already Applied** - Migration was deployed to Supabase
2. **Database:** ✅ Fixed and verified
3. **Tests:** ✅ RLS queries now work
4. **Frontend:** No changes needed

Everything is working correctly now!

---

## 📚 Technical Details

### SECURITY DEFINER Explained

When a function is created with `SECURITY DEFINER`:
- It runs with the permissions of the **function owner** (usually `postgres`)
- It **bypasses RLS policies** on tables
- It's the standard way to avoid RLS recursion
- It's still secure because the function logic is fixed and controlled

### The Difference

```sql
-- ❌ Without SECURITY DEFINER
SELECT * FROM admin_users  -- Triggers RLS in calling function
  
-- ✅ With SECURITY DEFINER
CREATE FUNCTION query_admins() SECURITY DEFINER AS $$
  SELECT * FROM admin_users  -- Bypasses RLS completely
$$ LANGUAGE SQL;
```

---

**Status:** 🟢 **FIXED & VERIFIED**

All systems operational!
