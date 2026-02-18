-- =====================================================
-- Fix RLS Permissions Issue
-- Migration: 20260218001400_fix_rls_permissions.sql
-- Purpose: Drop all problematic RLS policies and disable RLS
-- =====================================================

-- Ensure RLS is disabled on provider_withdrawals
ALTER TABLE public.provider_withdrawals DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to remove any auth.uid() checks
DROP POLICY IF EXISTS "Providers can view their own withdrawals" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "Providers can insert their own withdrawals" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "Admins can update withdrawal status" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "admin_can_read_provider_withdrawals" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "admin_can_insert_provider_withdrawals" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "admin_can_update_provider_withdrawals" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "allow_select_for_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "allow_insert_for_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "allow_update_for_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "allow_delete_for_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "test_allow_select_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "test_allow_insert_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "test_allow_update_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "test_allow_delete_all" ON public.provider_withdrawals;

-- IMPORTANT: RLS is now DISABLED completely
-- This allows all operations without permission checks
-- Once frontend testing is complete, implement proper SECURITY DEFINER functions
-- and re-enable RLS with restricted policies based on authenticated user context
