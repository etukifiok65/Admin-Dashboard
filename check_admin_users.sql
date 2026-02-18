-- Check admin_users table state
SELECT 
  id,
  auth_id,
  email,
  role,
  is_active,
  created_at
FROM public.admin_users
LIMIT 10;

-- Also check if current auth user exists
SELECT 
  id,
  email,
  raw_app_meta_data
FROM auth.users
LIMIT 5;
