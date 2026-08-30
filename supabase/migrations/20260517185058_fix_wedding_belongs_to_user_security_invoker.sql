/*
  # Fix wedding_belongs_to_user: SECURITY DEFINER → SECURITY INVOKER

  The function was SECURITY DEFINER (runs as postgres), which means auth.uid()
  returns null inside it — causing ALL RLS policies that use this function to
  block every authenticated user. Changing to SECURITY INVOKER means the function
  runs as the calling user, so auth.uid() correctly returns their user ID.
*/

CREATE OR REPLACE FUNCTION public.wedding_belongs_to_user(wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wedding_profile
    WHERE id = wid AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.wedding_belongs_to_user(uuid) TO authenticated;
