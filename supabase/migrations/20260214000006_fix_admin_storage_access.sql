-- =====================================================
-- Fix Admin Storage Access
-- Migration: Ensure admins can read provider documents from storage
-- Created: 2026-02-14
-- =====================================================

-- Drop existing admin storage policy if it exists
DROP POLICY IF EXISTS "admin_can_read_provider_documents_storage" ON storage.objects;
-- Create comprehensive admin read policy for provider-documents storage
CREATE POLICY "admin_can_read_provider_documents_storage" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'provider-documents' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
        AND admin_users.is_active = TRUE
    )
  );
-- Ensure the policy applies to authenticated users
GRANT SELECT ON storage.objects TO authenticated;
