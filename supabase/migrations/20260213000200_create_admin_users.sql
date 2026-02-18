-- =====================================================
-- Admin User Setup Migration
-- Migration: Create admin_users table
-- Created: 2026-02-13
-- =====================================================

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role = 'admin'),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_id ON public.admin_users(auth_id);
-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- RLS Policies for admin_users
-- =====================================================

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
-- Admins can view their own profile
DROP POLICY IF EXISTS "admin_can_view_own_profile" ON public.admin_users;
CREATE POLICY "admin_can_view_own_profile" ON public.admin_users
    FOR SELECT USING (auth_id = auth.uid());
-- Admins can update their own profile
DROP POLICY IF EXISTS "admin_can_update_own_profile" ON public.admin_users;
CREATE POLICY "admin_can_update_own_profile" ON public.admin_users
    FOR UPDATE USING (auth_id = auth.uid())
    WITH CHECK (auth_id = auth.uid());
-- =====================================================
-- Admin Access Policies for Other Tables
-- =====================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "admin_can_read_all_patients" ON public.patients;
DROP POLICY IF EXISTS "admin_can_update_patient_status" ON public.patients;
DROP POLICY IF EXISTS "admin_can_read_all_providers" ON public.providers;
DROP POLICY IF EXISTS "admin_can_update_provider_status" ON public.providers;
DROP POLICY IF EXISTS "admin_can_read_provider_documents" ON public.provider_documents;
DROP POLICY IF EXISTS "admin_can_update_provider_documents" ON public.provider_documents;
DROP POLICY IF EXISTS "admin_can_read_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "admin_can_read_transactions" ON public.transactions;
DROP POLICY IF EXISTS "admin_can_read_payouts" ON public.provider_payouts;
DROP POLICY IF EXISTS "admin_can_update_payouts" ON public.provider_payouts;
DROP POLICY IF EXISTS "admin_can_read_reviews" ON public.reviews;
DROP POLICY IF EXISTS "admin_can_read_provider_earnings" ON public.provider_earnings;
DROP POLICY IF EXISTS "admin_can_read_provider_wallets" ON public.provider_wallets;
DROP POLICY IF EXISTS "admin_can_read_notifications" ON public.notifications;
-- Allow admins to view all patients
CREATE POLICY "admin_can_read_all_patients" ON public.patients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to update patient verification status
CREATE POLICY "admin_can_update_patient_status" ON public.patients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view all providers
CREATE POLICY "admin_can_read_all_providers" ON public.providers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to update provider account status
CREATE POLICY "admin_can_update_provider_status" ON public.providers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view all provider documents
CREATE POLICY "admin_can_read_provider_documents" ON public.provider_documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to update provider documents (approval/rejection)
CREATE POLICY "admin_can_update_provider_documents" ON public.provider_documents
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view all appointments
CREATE POLICY "admin_can_read_all_appointments" ON public.appointments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view transaction logs
CREATE POLICY "admin_can_read_transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view provider payouts
CREATE POLICY "admin_can_read_payouts" ON public.provider_payouts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to update payout status
CREATE POLICY "admin_can_update_payouts" ON public.provider_payouts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view reviews
CREATE POLICY "admin_can_read_reviews" ON public.reviews
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view provider earnings
CREATE POLICY "admin_can_read_provider_earnings" ON public.provider_earnings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view provider wallets
CREATE POLICY "admin_can_read_provider_wallets" ON public.provider_wallets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Allow admins to view notifications
CREATE POLICY "admin_can_read_notifications" ON public.notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
