-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('profile-images', 'profile-images', true),
  ('patient-documents', 'patient-documents', false),
  ('provider-documents', 'provider-documents', false)
ON CONFLICT (id) DO NOTHING;
-- Storage policies for profile-images bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
-- Allow authenticated users to upload their profile images
CREATE POLICY "Users can upload own profile image"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
-- Allow authenticated users to update their profile images
CREATE POLICY "Users can update own profile image"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
-- Allow authenticated users to delete their profile images
CREATE POLICY "Users can delete own profile image"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
-- Allow anyone to view profile images (public bucket)
CREATE POLICY "Anyone can view profile images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
-- Storage policies for patient-documents bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Patients can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Patients can view own documents" ON storage.objects;
-- Allow authenticated patients to upload their own documents
CREATE POLICY "Patients can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM patients WHERE auth_id = auth.uid()
  )
);
-- Allow authenticated patients to view their own documents
CREATE POLICY "Patients can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM patients WHERE auth_id = auth.uid()
  )
);
-- Storage policies for provider-documents bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Providers can upload own documents" ON storage.objects;
DROP POLICY IF EXISTS "Providers can view own documents" ON storage.objects;
-- Allow authenticated providers to upload their own documents
CREATE POLICY "Providers can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers WHERE auth_id = auth.uid()
  )
);
-- Allow authenticated providers to view their own documents
CREATE POLICY "Providers can view own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM providers WHERE auth_id = auth.uid()
  )
);
