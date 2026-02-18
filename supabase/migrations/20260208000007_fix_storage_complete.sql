-- Ensure storage buckets exist with correct settings
DO $$
BEGIN
  -- Check if profile-images bucket exists, create if not
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'profile-images', 
      'profile-images', 
      true,
      5242880, -- 5MB
      ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    );
  ELSE
    -- Update existing bucket to ensure it's public
    UPDATE storage.buckets 
    SET 
      public = true,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    WHERE id = 'profile-images';
  END IF;
END $$;
-- Ensure all necessary policies exist for profile-images
DO $$
BEGIN
  -- Drop all existing policies
  DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own profile image" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own profile image" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;

  -- Create upload policy
  CREATE POLICY "Users can upload own profile image"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Create update policy
  CREATE POLICY "Users can update own profile image"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Create delete policy
  CREATE POLICY "Users can delete own profile image"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

  -- Create public read policy - CRITICAL for image display
  CREATE POLICY "Public can view all profile images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-images');
END $$;
