-- talak-web3 — Storage Buckets
-- Run this in your Supabase SQL Editor to set up storage buckets!

-- Enable storage if not already enabled
create extension if not exists "uuid-ossp";

-- Create blog-images bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do nothing;

-- Blog images bucket policies
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;

create policy "Public Access" on storage.objects
  for select
  using (bucket_id = 'blog-images');

create policy "Authenticated users can upload" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'blog-images'
    and (storage.foldername(name))[1] = 'blog-covers'
    or (storage.foldername(name))[1] = 'changelog-covers'
  );

create policy "Users can update their own objects" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'blog-images');

create policy "Users can delete their own objects" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'blog-images');

-- Optional: Create an "avatars" bucket for user profile images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Avatars bucket policies
create policy "Public Access for avatars" on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "Authenticated users can upload avatars" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
  );

create policy "Users can update their own avatars" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'avatars');

create policy "Users can delete their own avatars" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'avatars');
