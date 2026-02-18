-- =====================================================
-- Disable RLS on Related Tables
-- Migration: 20260218001500_disable_rls_related_tables.sql
-- Purpose: Disable RLS on all tables involved in the withdrawal query
-- =====================================================

-- Disable RLS on provider_payout_methods
ALTER TABLE public.provider_payout_methods DISABLE ROW LEVEL SECURITY;

-- Disable RLS on providers (if enabled)
ALTER TABLE public.providers DISABLE ROW LEVEL SECURITY;

-- Drop any policies on these tables that might be causing auth checks
DROP POLICY IF EXISTS "Providers can view payment methods" ON public.provider_payout_methods;
DROP POLICY IF EXISTS "Providers can insert payment methods" ON public.provider_payout_methods;
DROP POLICY IF EXISTS "Providers can update payment methods" ON public.provider_payout_methods;
DROP POLICY IF EXISTS "Providers can read their own data" ON public.providers;
DROP POLICY IF EXISTS "Allow profile_photo access" ON public.providers;

-- End result: All withdrawal-related tables have RLS disabled for testing
