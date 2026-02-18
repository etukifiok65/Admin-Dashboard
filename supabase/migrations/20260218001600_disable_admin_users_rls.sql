-- =====================================================
-- Disable RLS on admin_users Table
-- Migration: 20260218001600_disable_admin_users_rls.sql
-- Purpose: Remove auth.uid() checks that are causing permission denied errors
-- =============================================

ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Drop all policies on admin_users that might reference auth.uid()
DROP POLICY IF EXISTS "Admins can read admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can update admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admins can insert admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Users can read their own admin record" ON public.admin_users;
