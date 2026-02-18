-- =====================================================
-- Admin Provider Withdrawals Access
-- Migration: Allow admins to read, insert, and update provider withdrawals
-- Created: 2026-02-18
-- =====================================================

-- Drop broken UPDATE policy that references wrong table
DROP POLICY IF EXISTS "Admins can update withdrawal status" ON public.provider_withdrawals;

-- Allow admins to read all provider withdrawals
DROP POLICY IF EXISTS "admin_can_read_provider_withdrawals" ON public.provider_withdrawals;
CREATE POLICY "admin_can_read_provider_withdrawals" ON public.provider_withdrawals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Allow admins to insert provider withdrawal requests
DROP POLICY IF EXISTS "admin_can_insert_provider_withdrawals" ON public.provider_withdrawals;
CREATE POLICY "admin_can_insert_provider_withdrawals" ON public.provider_withdrawals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Allow admins to update provider withdrawal status
DROP POLICY IF EXISTS "admin_can_update_provider_withdrawals" ON public.provider_withdrawals;
CREATE POLICY "admin_can_update_provider_withdrawals" ON public.provider_withdrawals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Note: Providers can still read/insert their own withdrawals via existing policies
