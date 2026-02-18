BEGIN;

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_super_admin()
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
      AND role = 'super_admin'
      AND is_active = TRUE
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

DROP POLICY IF EXISTS "Admins can read admin users" ON public.admin_users;
CREATE POLICY "Admins can read admin users"
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_users AS actor
      WHERE actor.auth_id = auth.uid()
        AND actor.is_active = TRUE
        AND actor.role IN ('super_admin', 'admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
CREATE POLICY "Super admins can update admin users"
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

COMMIT;