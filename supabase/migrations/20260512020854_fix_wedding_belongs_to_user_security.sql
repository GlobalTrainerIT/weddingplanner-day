/*
  # Fix wedding_belongs_to_user function security

  1. Changes
    - Set a fixed search_path on the function to prevent search_path injection
    - Revoke EXECUTE from anon and authenticated roles so it cannot be called
      directly via REST API (/rpc/wedding_belongs_to_user)
    - The function is only used internally by RLS policies (as SECURITY DEFINER
      called by postgres), so public execute access is not needed
*/

CREATE OR REPLACE FUNCTION public.wedding_belongs_to_user(wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wedding_profile
    WHERE id = wid AND user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.wedding_belongs_to_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.wedding_belongs_to_user(uuid) FROM authenticated;
