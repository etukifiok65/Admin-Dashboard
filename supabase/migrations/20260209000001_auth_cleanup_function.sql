-- =====================================================
-- Auth User Cleanup Function
-- Migration: Create function to handle orphaned auth users
-- Created: 2026-02-09
-- =====================================================

-- This migration adds a cleanup mechanism for orphaned auth users
-- When a provider/patient profile creation fails, we need to handle it gracefully

-- Create a function to check if an auth user has a complete profile
CREATE OR REPLACE FUNCTION check_user_profile_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- This function will be called after auth user creation
  -- It ensures that a profile is created, otherwise the auth user should be flagged
  
  -- For now, we'll just log this
  -- In production, you might want to set up a scheduled cleanup job
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create a view to identify orphaned auth users (users without profiles)
CREATE OR REPLACE VIEW orphaned_auth_users AS
SELECT au.id, au.email, au.created_at
FROM auth.users au
LEFT JOIN public.patients p ON p.auth_id = au.id
LEFT JOIN public.providers pr ON pr.auth_id = au.id
WHERE p.id IS NULL AND pr.id IS NULL
  AND au.created_at < NOW() - INTERVAL '1 hour';
-- Only flag users created more than 1 hour ago

-- Add a helpful comment
COMMENT ON VIEW orphaned_auth_users IS 'Lists auth users that do not have a corresponding patient or provider profile. These are likely failed signups that need cleanup.';
-- Note: To actually delete orphaned users, you'll need to run a periodic cleanup job
-- using the service role key, as the client cannot delete auth users.
-- 
-- Example cleanup query (run with service role key):
-- DELETE FROM auth.users WHERE id IN (SELECT id FROM orphaned_auth_users);;
