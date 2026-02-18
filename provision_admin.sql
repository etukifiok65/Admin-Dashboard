-- Provision super admin for homicareplus@gmail.com

-- First find the auth user
SELECT id, email FROM auth.users WHERE email = 'homicareplus@gmail.com';

-- Then create the admin_users record
INSERT INTO public.admin_users (auth_id, email, name, role, is_active)
SELECT 
  auth.id,
  auth.email,
  COALESCE(auth.raw_user_meta_data->>'name', SPLIT_PART(auth.email, '@', 1)),
  'super_admin',
  TRUE
FROM (SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'homicareplus@gmail.com') AS auth
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'super_admin',
  is_active = TRUE,
  updated_at = NOW()
RETURNING auth_id, email, role, is_active;
