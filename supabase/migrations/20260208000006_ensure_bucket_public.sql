-- Ensure profile-images bucket is truly public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-images';
-- Recreate the public access policy to ensure it's working
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');
