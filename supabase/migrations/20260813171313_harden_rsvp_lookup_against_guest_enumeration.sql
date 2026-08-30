/*
# Harden the RSVP guest lookup against list enumeration

1. Problem
   `rsvp_lookup(p_slug, p_query)` accepted a two-character query and matched it
   anywhere inside a name (`LIKE '%q%'`). Anyone holding an RSVP link could walk
   two-letter combinations and harvest the whole guest list, including meal
   choices and dietary restrictions.

2. Change
   - Minimum query length raised from 2 to 3 characters.
   - Matching is anchored to the START of the first name, the last name, the
     full name, or the household name instead of matching anywhere inside them,
     so a guest typing their own name still finds themselves.
   - A hard cap of 40 returned rows, so a single call can no longer pull a
     whole guest list.

3. Security
   Removes the bulk-extraction path from the public RSVP surface while keeping
   the "search for your name" flow working.
*/

CREATE OR REPLACE FUNCTION public.rsvp_lookup(p_slug text, p_query text)
RETURNS TABLE(
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
SET search_path TO 'public'
AS $$
DECLARE
  v_wedding_id uuid;
  v_q text;
BEGIN
  v_q := lower(btrim(coalesce(p_query, '')));
  IF length(v_q) < 3 THEN
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
      AND lower(h.name) LIKE v_q || '%'
    UNION
    SELECT g.household_id
    FROM guests g
    WHERE g.wedding_id = v_wedding_id
      AND g.household_id IS NOT NULL
      AND (lower(g.first_name || ' ' || g.last_name) LIKE v_q || '%'
        OR lower(g.first_name) LIKE v_q || '%'
        OR lower(g.last_name) LIKE v_q || '%')
    LIMIT 10
  ),
  results AS (
    SELECT
      h.id AS hid, h.name AS hname,
      g.id AS gid, g.first_name, g.last_name,
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
      AND (lower(g.first_name || ' ' || g.last_name) LIKE v_q || '%'
        OR lower(g.first_name) LIKE v_q || '%'
        OR lower(g.last_name) LIKE v_q || '%')
  )
  SELECT * FROM results LIMIT 40;
END;
$$;
