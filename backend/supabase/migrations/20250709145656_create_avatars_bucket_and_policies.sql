-- Create a new bucket for user avatars.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_can_upload_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_can_view_own_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_can_update_own_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_can_delete_own_avatars" ON storage.objects;

-- Allow authenticated users to upload files to their own folder.
-- The file path must start with their user ID followed by a slash.
CREATE POLICY "users_can_upload_avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  name LIKE auth.uid()::text || '/%'
);

-- Allow users to view and download their own files.
CREATE POLICY "users_can_view_own_avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE auth.uid()::text || '/%'
);

-- Allow users to update their own files.
CREATE POLICY "users_can_update_own_avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE auth.uid()::text || '/%'
);

-- Allow users to delete their own files.
CREATE POLICY "users_can_delete_own_avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  name LIKE auth.uid()::text || '/%'
);