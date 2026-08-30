-- ============================================================
-- Private storage bucket for vendor contracts
-- Path convention: contracts/{wedding_id}/{vendor_id}/{filename}
-- Only members of the wedding (owner or partner) can read/write.
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Helper: check whether a path segment is a wedding the caller belongs to.
-- The path is: contracts/{wedding_id}/{vendor_id}/{filename}
-- storage.foldername(name)[1] = wedding_id
CREATE OR REPLACE FUNCTION contract_path_belongs_to_user(path text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT wedding_belongs_to_user(path::uuid);
$$;

-- DROP existing policies (idempotent)
DROP POLICY IF EXISTS "contracts_select_own" ON storage.objects;
DROP POLICY IF EXISTS "contracts_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "contracts_update_own" ON storage.objects;
DROP POLICY IF EXISTS "contracts_delete_own" ON storage.objects;

-- Read: only if the wedding_id folder segment belongs to the caller
CREATE POLICY "contracts_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND contract_path_belongs_to_user((storage.foldername(name))[1])
  );

-- Insert: same ownership check + must be in the contracts bucket
CREATE POLICY "contracts_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND contract_path_belongs_to_user((storage.foldername(name))[1])
  );

-- Update: same ownership check
CREATE POLICY "contracts_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND contract_path_belongs_to_user((storage.foldername(name))[1])
  )
  WITH CHECK (
    bucket_id = 'contracts'
    AND contract_path_belongs_to_user((storage.foldername(name))[1])
  );

-- Delete: same ownership check
CREATE POLICY "contracts_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'contracts'
    AND contract_path_belongs_to_user((storage.foldername(name))[1])
  );
