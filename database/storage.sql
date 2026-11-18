-- Private bucket for face enrollment samples (JPEG/PNG only, 5MB limit).
-- Run in Supabase SQL Editor after schema.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'face-samples',
    'face-samples',
    false,
    5242880,
    array['image/jpeg', 'image/png']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Admin access for authenticated users. The backend uses service_role,
-- which bypasses storage RLS automatically.

drop policy if exists "allow_face_sample_upload" on storage.objects;
create policy "allow_face_sample_upload"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'face-samples'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png')
);

drop policy if exists "allow_face_sample_read" on storage.objects;
create policy "allow_face_sample_read"
on storage.objects for select to authenticated
using (bucket_id = 'face-samples');

drop policy if exists "allow_face_sample_delete" on storage.objects;
create policy "allow_face_sample_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'face-samples');

