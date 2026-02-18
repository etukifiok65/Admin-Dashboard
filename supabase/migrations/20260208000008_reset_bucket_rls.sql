-- Reset and reconfigure profile-images bucket completely
-- This migration fixes RLS policy issues by removing restrictive folder-level checks

-- Step 1: Verify bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile image" ON storage.objects;
DROP POLICY IF EXISTS "Public can view all profile images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "profile_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "profile_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "profile_delete_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "profile_select_public" ON storage.objects;
DROP POLICY IF EXISTS "profile_select_authenticated" ON storage.objects;
-- Step 3: Create simple permissive policies (no folder restrictions)
CREATE POLICY "Allow authenticated insert to profile-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');
CREATE POLICY "Allow authenticated update to profile-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images');
CREATE POLICY "Allow authenticated delete from profile-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');
-- This is the critical policy for images to be viewable
CREATE POLICY "Allow public select from profile-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-images');
