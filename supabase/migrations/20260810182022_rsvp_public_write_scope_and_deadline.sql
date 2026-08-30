-- F2/F13: public RSVP writes must be bound to an open wedding, not to `true`.
CREATE OR REPLACE FUNCTION public.rsvp_is_open(wid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wedding_profile wp
    WHERE wp.id = wid
      AND wp.rsvp_enabled = true
      AND (wp.rsvp_deadline IS NULL OR wp.rsvp_deadline >= current_date)
  );
$$;

REVOKE ALL ON FUNCTION public.rsvp_is_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rsvp_is_open(uuid) TO anon, authenticated;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='rsvp_responses'
             AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rsvp_responses', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "public_rsvp_insert_open_wedding" ON public.rsvp_responses
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.rsvp_is_open(wedding_id));

CREATE POLICY "public_rsvp_select_open_wedding" ON public.rsvp_responses
  FOR SELECT TO anon, authenticated
  USING (public.rsvp_is_open(wedding_id));

CREATE POLICY "public_rsvp_update_open_wedding" ON public.rsvp_responses
  FOR UPDATE TO anon, authenticated
  USING (public.rsvp_is_open(wedding_id))
  WITH CHECK (public.rsvp_is_open(wedding_id));

-- Anonymous responders may only touch the RSVP fields.
REVOKE INSERT, UPDATE, DELETE ON public.rsvp_responses FROM anon;
GRANT INSERT (wedding_id, guest_id, guest_name, rsvp_status, meal_choice,
              dietary_restrictions, plus_one_attending, plus_one_name, message)
  ON public.rsvp_responses TO anon;
GRANT UPDATE (guest_name, rsvp_status, meal_choice, dietary_restrictions,
              plus_one_attending, plus_one_name, message)
  ON public.rsvp_responses TO anon;
