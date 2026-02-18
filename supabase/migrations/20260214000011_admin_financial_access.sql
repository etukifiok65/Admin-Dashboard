-- =====================================================
-- Admin Financial Data Access (Additional Policies)
-- Migration: Allow admin read access to remaining financial tables
-- Created: 2026-02-14
-- Note: Core financial policies (transactions, payouts, earnings, wallets)
--       are already defined in 20260213000200_create_admin_users.sql
-- =====================================================

-- Admins can view provider payout methods
DROP POLICY IF EXISTS "admin_can_read_provider_payout_methods" ON public.provider_payout_methods;
CREATE POLICY "admin_can_read_provider_payout_methods" ON public.provider_payout_methods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Admins can view patient wallets
DROP POLICY IF EXISTS "admin_can_read_patient_wallets" ON public.patient_wallet;
CREATE POLICY "admin_can_read_patient_wallets" ON public.patient_wallet
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Admins can view provider transaction logs
DROP POLICY IF EXISTS "admin_can_read_provider_transaction_logs" ON public.provider_transaction_logs;
CREATE POLICY "admin_can_read_provider_transaction_logs" ON public.provider_transaction_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
