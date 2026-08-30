REVOKE SELECT, INSERT, UPDATE, DELETE ON public.households FROM anon;

GRANT SELECT (id, wedding_id, name) ON public.households TO anon;