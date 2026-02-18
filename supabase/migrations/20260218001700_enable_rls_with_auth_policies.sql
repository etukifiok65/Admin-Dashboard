-- =====================================================
-- Re-enable RLS with Authenticated User Policies
-- Migration: 20260218001700_enable_rls_with_auth_policies.sql
-- Purpose: Allow authenticated users (logged-in admins) to access withdrawal data
-- =====================================================

-- ===== PROVIDER_WITHDRAWALS TABLE =====
-- Enable RLS
ALTER TABLE public.provider_withdrawals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (logged-in admins) to SELECT
CREATE POLICY "authenticated_can_select_withdrawals" ON public.provider_withdrawals
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users (logged-in admins) to UPDATE
CREATE POLICY "authenticated_can_update_withdrawals" ON public.provider_withdrawals
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users (logged-in admins) to INSERT
CREATE POLICY "authenticated_can_insert_withdrawals" ON public.provider_withdrawals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ===== PROVIDER_PAYOUT_METHODS TABLE =====
-- Enable RLS
ALTER TABLE public.provider_payout_methods ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT payment methods
CREATE POLICY "authenticated_can_select_methods" ON public.provider_payout_methods
  FOR SELECT
  TO authenticated
  USING (true);

-- ===== PROVIDERS TABLE =====
-- Enable RLS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT providers
CREATE POLICY "authenticated_can_select_providers" ON public.providers
  FOR SELECT
  TO authenticated
  USING (true);

-- ===== ADMIN_USERS TABLE =====
-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT admin_users (needed for auth checks)
CREATE POLICY "authenticated_can_select_admin_users" ON public.admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to UPDATE admin_users (if needed)
CREATE POLICY "authenticated_can_update_admin_users" ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
