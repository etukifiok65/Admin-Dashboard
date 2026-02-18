-- Fix storage policies to use auth.uid() directly instead of table lookups

-- Drop and recreate patient-documents policies
DROP POLICY IF EXISTS "Patients can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Patients can view own documents" ON storage.objects;
CREATE POLICY "Patients can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Patients can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
-- Drop and recreate provider-documents policies
DROP POLICY IF EXISTS "Providers can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view own documents" ON storage.objects;
CREATE POLICY "Providers can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Providers can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
