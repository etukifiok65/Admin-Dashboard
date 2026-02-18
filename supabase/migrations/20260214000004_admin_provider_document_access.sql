-- =====================================================
-- Admin Provider Document Access
-- Migration: Allow admins to read provider-documents storage
-- Created: 2026-02-14
-- =====================================================

-- Allow admins to read provider documents in storage
DROP POLICY IF EXISTS "admin_can_read_provider_documents_storage" ON storage.objects;
CREATE POLICY "admin_can_read_provider_documents_storage" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'provider-documents' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
        AND admin_users.is_active = TRUE
    )
  );
