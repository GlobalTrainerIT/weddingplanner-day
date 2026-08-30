/*
  # Revoke PUBLIC execute on wedding_belongs_to_user

  The function had EXECUTE granted to PUBLIC (which includes anon and authenticated
  roles), allowing it to be called via the REST API. This migration revokes that
  grant so the function can only be invoked internally by RLS policies running
  as postgres/service_role.
*/

REVOKE EXECUTE ON FUNCTION public.wedding_belongs_to_user(uuid) FROM PUBLIC;
