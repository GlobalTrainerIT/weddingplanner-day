REVOKE EXECUTE ON FUNCTION public.contract_path_belongs_to_user(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.contract_path_belongs_to_user(text) TO authenticated;