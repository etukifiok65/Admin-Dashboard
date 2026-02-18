-- =====================================================
-- Admin Patient Detail Policies
-- Migration: Allow admin read access to patient details
-- Created: 2026-02-14
-- =====================================================

-- Enable RLS on related patient tables if not already enabled
ALTER TABLE public.patient_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_info ENABLE ROW LEVEL SECURITY;
-- Admins can view patient addresses
DROP POLICY IF EXISTS "admin_can_read_patient_addresses" ON public.patient_addresses;
CREATE POLICY "admin_can_read_patient_addresses" ON public.patient_addresses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Admins can view emergency contacts
DROP POLICY IF EXISTS "admin_can_read_emergency_contacts" ON public.emergency_contacts;
CREATE POLICY "admin_can_read_emergency_contacts" ON public.emergency_contacts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
-- Admins can view medical info
DROP POLICY IF EXISTS "admin_can_read_medical_info" ON public.medical_info;
CREATE POLICY "admin_can_read_medical_info" ON public.medical_info
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
