-- Fix infinite recursion in admin_users RLS policy
-- The SELECT policy was querying the same table it's protecting
BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can read admin users" ON public.admin_users;

-- Recreate with a SECURITY DEFINER helper function instead of direct table query
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

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

-- New policy using the SECURITY DEFINER function (no recursion)
CREATE POLICY "Admins can read admin users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (public.current_user_is_admin());

-- Also update UPDATE policy to use the helper function for consistency
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
CREATE POLICY "Super admins can update admin users"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Add DROP policy for super admins
DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.admin_users;
CREATE POLICY "Super admins can delete admin users"
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- Add INSERT policy for super admins
DROP POLICY IF EXISTS "Super admins can insert admin users" ON public.admin_users;
CREATE POLICY "Super admins can insert admin users"
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

COMMIT;
