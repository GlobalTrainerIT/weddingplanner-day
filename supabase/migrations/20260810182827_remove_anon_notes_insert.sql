DROP POLICY IF EXISTS "Public insert rsvp notes" ON public.notes;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.notes FROM anon;