-- =====================================================
-- Fix: Admin Users Role Constraint
-- Migration: Allow all three admin roles
-- Issue: CHECK(role = 'admin') only allows 'admin'
--        But RLS policy expects 'super_admin', 'admin', 'moderator'
-- =====================================================

BEGIN;

-- Drop the restrictive constraint
ALTER TABLE public.admin_users
DROP CONSTRAINT admin_users_role_check;

-- Add new constraint allowing all three roles
ALTER TABLE public.admin_users
ADD CONSTRAINT admin_users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'moderator'));

-- Verify the change
COMMENT ON CONSTRAINT admin_users_role_check ON public.admin_users 
  IS 'Admin users must be one of: super_admin, admin, or moderator';

COMMIT;
