-- =====================================================
-- Admin Appointment Update Policy
-- Migration: Allow admins to update appointment status
-- Created: 2026-02-14
-- =====================================================

-- Allow admins to update all appointments (for status changes)
DROP POLICY IF EXISTS "admin_can_update_appointments" ON public.appointments;
CREATE POLICY "admin_can_update_appointments" ON public.appointments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
