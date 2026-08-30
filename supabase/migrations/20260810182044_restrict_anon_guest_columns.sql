-- F3/F4/F13: anonymous RSVP visitors get only the columns the RSVP page needs,
-- and only while the wedding is open. authenticated owners keep full access.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='guests' AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.guests', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "public_guest_select_open_wedding" ON public.guests
  FOR SELECT TO anon
  USING (public.rsvp_is_open(wedding_id));

CREATE POLICY "public_guest_update_open_wedding" ON public.guests
  FOR UPDATE TO anon
  USING (public.rsvp_is_open(wedding_id))
  WITH CHECK (public.rsvp_is_open(wedding_id));

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.guests FROM anon;

GRANT SELECT (id, wedding_id, first_name, last_name, rsvp_status, meal_choice,
              dietary_restrictions, has_plus_one, plus_one_name, plus_one_rsvp,
              plus_one_allowed, household_id)
  ON public.guests TO anon;

GRANT UPDATE (rsvp_status, meal_choice, dietary_restrictions, plus_one_rsvp, plus_one_name)
  ON public.guests TO anon;
