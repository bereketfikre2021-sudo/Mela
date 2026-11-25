-- MELA 0033: Business avatar support.
--
-- Adds avatar_url column to businesses table and creates the
-- business-avatars storage bucket with public read access.

-- ── 1. Add avatar_url column ──────────────────────────────────────────────────
alter table public.businesses
  add column if not exists avatar_url text;

-- ── 2. Storage bucket ─────────────────────────────────────────────────────────
-- Create the bucket (public so avatar URLs work without auth tokens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-avatars',
  'business-avatars',
  true,
  2097152,  -- 2 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- ── 3. Storage RLS policies ───────────────────────────────────────────────────
-- Public read (avatars are shown to anyone who has the URL)
create policy "public read business avatars"
  on storage.objects for select
  using (bucket_id = 'business-avatars');

-- Owners can upload/update their own avatar (path = owner_id/business_id.ext)
create policy "owners upload own business avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'business-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners update own business avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'business-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners delete own business avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'business-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
