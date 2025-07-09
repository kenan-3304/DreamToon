-- Test storage policies
-- This file can be run in the Supabase SQL editor to test the policies

-- First, let's check if the bucket exists
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- Check if the policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%avatars%';

-- Test the policy logic
-- This should return the current user's ID
SELECT auth.uid() as current_user_id;

-- Test if a file path would match the policy
-- Replace 'your-user-id' with an actual user ID
SELECT 
    'your-user-id/original_123.jpg' as file_path,
    'your-user-id/original_123.jpg' LIKE auth.uid()::text || '/%' as matches_policy; 