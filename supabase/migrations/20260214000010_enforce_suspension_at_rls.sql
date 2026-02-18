-- =====================================================
-- Enforce Account Suspension at RLS Level
-- Migration: Add RLS policies to prevent suspended account access
-- Created: 2026-02-14
-- =====================================================

-- Patients: Only allow access if account is active
DROP POLICY IF EXISTS "Patients can view their own profile" ON public.patients;
CREATE POLICY "Patients can view their own profile" ON public.patients
    FOR SELECT
    USING (
        auth_id = auth.uid() AND is_active = TRUE
    );
DROP POLICY IF EXISTS "Patients can update their own profile" ON public.patients;
CREATE POLICY "Patients can update their own profile" ON public.patients
    FOR UPDATE
    USING (
        auth_id = auth.uid() AND is_active = TRUE
    )
    WITH CHECK (
        auth_id = auth.uid() AND is_active = TRUE
    );
-- Providers: Only allow access if account is active
DROP POLICY IF EXISTS "Providers can view their own profile" ON public.providers;
CREATE POLICY "Providers can view their own profile" ON public.providers
    FOR SELECT
    USING (
        auth_id = auth.uid() AND is_active = TRUE
    );
DROP POLICY IF EXISTS "Providers can update their own profile" ON public.providers;
CREATE POLICY "Providers can update their own profile" ON public.providers
    FOR UPDATE
    USING (
        auth_id = auth.uid() AND is_active = TRUE
    )
    WITH CHECK (
        auth_id = auth.uid() AND is_active = TRUE
    );
-- Appointments: Prevent suspended patients from viewing/creating appointments
DROP POLICY IF EXISTS "Patients can view appointments" ON public.appointments;
CREATE POLICY "Patients can view appointments" ON public.appointments
    FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients 
            WHERE auth_id = auth.uid() AND is_active = TRUE
        )
    );
DROP POLICY IF EXISTS "Patients can create appointments" ON public.appointments;
CREATE POLICY "Patients can create appointments" ON public.appointments
    FOR INSERT
    WITH CHECK (
        patient_id IN (
            SELECT id FROM patients 
            WHERE auth_id = auth.uid() AND is_active = TRUE
        )
    );
-- Prevent suspended providers from viewing/accepting appointments
DROP POLICY IF EXISTS "Providers can view appointments" ON public.appointments;
CREATE POLICY "Providers can view appointments" ON public.appointments
    FOR SELECT
    USING (
        provider_id IN (
            SELECT id FROM providers 
            WHERE auth_id = auth.uid() AND is_active = TRUE
        )
    );
DROP POLICY IF EXISTS "Providers can update appointments" ON public.appointments;
CREATE POLICY "Providers can update appointments" ON public.appointments
    FOR UPDATE
    USING (
        provider_id IN (
            SELECT id FROM providers 
            WHERE auth_id = auth.uid() AND is_active = TRUE
        )
    )
    WITH CHECK (
        provider_id IN (
            SELECT id FROM providers 
            WHERE auth_id = auth.uid() AND is_active = TRUE
        )
    );
-- Medical info: Prevent suspended patients from accessing
DROP POLICY IF EXISTS "Patients can view medical info" ON public.medical_info;
CREATE POLICY "Patients can view medical info" ON public.medical_info
    FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients 
            WHERE auth_id = auth.uid() AND is_active = TRUE
        )
    );
-- Messages: Prevent suspended accounts from sending/viewing messages
DROP POLICY IF EXISTS "Suspended users cannot view messages" ON public.appointment_messages;
CREATE POLICY "Suspended users cannot view messages" ON public.appointment_messages
    FOR SELECT
    USING (
        (sender_id IN (
            SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = TRUE
        ))
        OR
        (sender_id IN (
            SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = TRUE
        ))
    );
DROP POLICY IF EXISTS "Suspended users cannot send messages" ON public.appointment_messages;
CREATE POLICY "Suspended users cannot send messages" ON public.appointment_messages
    FOR INSERT
    WITH CHECK (
        (sender_id IN (
            SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = TRUE
        ))
        OR
        (sender_id IN (
            SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = TRUE
        ))
    );
