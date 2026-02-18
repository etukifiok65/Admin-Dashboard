-- Update admin_users table to support multiple admin roles
-- This allows super_admin, admin, and moderator roles

-- Drop existing role check constraint
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
-- Add new role check constraint with multiple values
ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'moderator'));
-- Update any existing admin records to have explicit role (if needed)
-- This ensures existing admins continue to work
UPDATE admin_users SET role = 'admin' WHERE role IS NULL OR role = '';
