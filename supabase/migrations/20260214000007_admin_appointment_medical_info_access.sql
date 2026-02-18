-- =====================================================
-- Admin Appointment Medical Info Access
-- Migration: Allow admin read access to appointment medical info
-- Created: 2026-02-14
-- =====================================================

-- Admins can view appointment medical info
DROP POLICY IF EXISTS "admin_can_read_appointment_medical_info" ON public.appointment_medical_info;
CREATE POLICY "admin_can_read_appointment_medical_info" ON public.appointment_medical_info
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
