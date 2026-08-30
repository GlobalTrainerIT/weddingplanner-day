-- F1/F2: anon can no longer bulk-read guests or households.
-- Public RSVP lookup goes through a slug-scoped, search-term-scoped definer function.

CREATE OR REPLACE FUNCTION public.rsvp_lookup(p_slug text, p_query text)
RETURNS TABLE (
  out_household_id uuid,
  out_household_name text,
  out_guest_id uuid,
  out_first_name text,
  out_last_name text,
  out_rsvp_status text,
  out_meal_choice text,
  out_dietary_restrictions text,
  out_has_plus_one boolean,
  out_plus_one_name text,
  out_plus_one_rsvp text,
  out_plus_one_allowed boolean,
  out_wedding_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wedding_id uuid;
  v_q text;
BEGIN
  v_q := lower(btrim(coalesce(p_query, '')));
  IF length(v_q) < 2 THEN
    RETURN;
  END IF;

  SELECT wp.id INTO v_wedding_id
  FROM wedding_profile wp
  WHERE wp.rsvp_slug = p_slug
    AND wp.rsvp_enabled = true
    AND (wp.rsvp_deadline IS NULL OR wp.rsvp_deadline >= current_date)
  LIMIT 1;

  IF v_wedding_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matched_households AS (
    SELECT h.id
    FROM households h
    WHERE h.wedding_id = v_wedding_id
      AND lower(h.name) LIKE '%' || v_q || '%'
    UNION
    SELECT g.household_id
    FROM guests g
    WHERE g.wedding_id = v_wedding_id
      AND g.household_id IS NOT NULL
      AND (lower(g.first_name || ' ' || g.last_name) LIKE '%' || v_q || '%'
           OR lower(g.first_name) LIKE '%' || v_q || '%'
           OR lower(g.last_name) LIKE '%' || v_q || '%')
    LIMIT 25
  )
  SELECT
    h.id, h.name,
    g.id, g.first_name, g.last_name,
    g.rsvp_status, g.meal_choice, g.dietary_restrictions,
    g.has_plus_one, g.plus_one_name, g.plus_one_rsvp, g.plus_one_allowed,
    g.wedding_id
  FROM guests g
  JOIN households h ON h.id = g.household_id
  WHERE g.wedding_id = v_wedding_id
    AND g.household_id IN (SELECT id FROM matched_households)

  UNION ALL

  SELECT
    NULL::uuid, NULL::text,
    g.id, g.first_name, g.last_name,
    g.rsvp_status, g.meal_choice, g.dietary_restrictions,
    g.has_plus_one, g.plus_one_name, g.plus_one_rsvp, g.plus_one_allowed,
    g.wedding_id
  FROM guests g
  WHERE g.wedding_id = v_wedding_id
    AND g.household_id IS NULL
    AND (lower(g.first_name || ' ' || g.last_name) LIKE '%' || v_q || '%'
         OR lower(g.first_name) LIKE '%' || v_q || '%'
         OR lower(g.last_name) LIKE '%' || v_q || '%');
END;
$$;

REVOKE ALL ON FUNCTION public.rsvp_lookup(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.rsvp_lookup(text, text) TO anon, authenticated;

-- Remove the bulk anon read paths these replace.
DROP POLICY IF EXISTS "public_guest_select_open_wedding" ON public.guests;
DROP POLICY IF EXISTS "Public read households for rsvp" ON public.households;

REVOKE ALL ON TABLE public.guests FROM anon;
REVOKE ALL ON TABLE public.households FROM anon;
