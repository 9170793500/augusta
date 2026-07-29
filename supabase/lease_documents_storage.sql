-- Lease document uploads (PDF, images, DOCX)
-- Run in Supabase SQL Editor

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lease-documents',
  'lease-documents',
  true,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lease_documents_public_read" on storage.objects;
create policy "lease_documents_public_read"
  on storage.objects for select
  using (bucket_id = 'lease-documents');

drop policy if exists "lease_documents_upload" on storage.objects;
create policy "lease_documents_upload"
  on storage.objects for insert
  with check (bucket_id = 'lease-documents');

drop policy if exists "lease_documents_update" on storage.objects;
create policy "lease_documents_update"
  on storage.objects for update
  using (bucket_id = 'lease-documents')
  with check (bucket_id = 'lease-documents');

notify pgrst, 'reload schema';
