-- LAUNCH 02 — private document storage bucket
-- Never public. Never permanent public URL. Signed URL only after server authorize.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-documents',
  'pet-documents',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'text/plain'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- No direct client Storage policies for write/read of pet docs.
-- Upload/download goes through Edge Functions after authorize(documents.*).
-- Authenticated users cannot list or read objects via Storage API alone.

CREATE POLICY pet_documents_storage_no_direct_select
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pet-documents' AND false);

CREATE POLICY pet_documents_storage_no_direct_insert
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pet-documents' AND false);

CREATE POLICY pet_documents_storage_no_direct_update
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pet-documents' AND false);

CREATE POLICY pet_documents_storage_no_direct_delete
  ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pet-documents' AND false);
