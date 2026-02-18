-- =====================================================
-- Disable RLS for Testing
-- Migration: 20260218001300_disable_rls_for_testing.sql
-- Purpose: Temporarily disable RLS to test UPDATE functionality
-- =====================================================

ALTER TABLE public.provider_withdrawals DISABLE ROW LEVEL SECURITY;
