-- =====================================================
-- Admin Visit Notes Access
-- Migration: Allow admin read access to visit notes
-- Created: 2026-02-14
-- =====================================================

-- Admins can view visit notes
DROP POLICY IF EXISTS "admin_can_read_visit_notes" ON public.visit_notes;
CREATE POLICY "admin_can_read_visit_notes" ON public.visit_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users
            WHERE admin_users.auth_id = auth.uid()
            AND admin_users.is_active = TRUE
        )
    );
