-- Crew Call: photos for projects and crowdfunding campaigns
-- Run this once in Supabase: SQL Editor > New query > paste > Run. Safe to run again.
-- Photos are shrunk in the browser to about 100 KB (1000 x 563 JPEG) before upload,
-- so the free plan's 1 GB of storage holds roughly 10,000 of them.

-- 1. A public bucket: anyone with the link can see a photo, as on any website
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 600000, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 600000, allowed_mime_types = array['image/jpeg'];

-- 2. Signed-in members can upload into their own folder (named after their user id) and delete their own photos
drop policy if exists "crewcall covers upload" on storage.objects;
create policy "crewcall covers upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text and public.is_member());

drop policy if exists "crewcall covers delete" on storage.objects;
create policy "crewcall covers delete" on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (storage.foldername(name))[1] = auth.uid()::text);

-- Check: select id, public, file_size_limit from storage.buckets where id = 'covers';
-- Space used: select count(*), pg_size_pretty(sum((metadata ->> 'size')::bigint)) from storage.objects where bucket_id = 'covers';
