-- F3: anon can no longer enumerate wedding_profile. Public share pages must
-- present the slug, which a definer function resolves to exactly one row.

CREATE OR REPLACE FUNCTION public.timeline_share_is_open(wid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wedding_profile wp
    WHERE wp.id = wid AND wp.timeline_share_enabled = true
  );
$$;

REVOKE ALL ON FUNCTION public.timeline_share_is_open(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.timeline_share_is_open(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_wedding_by_slug(p_slug text, p_kind text)
RETURNS TABLE (
  out_id uuid,
  out_partner1_name text,
  out_partner2_name text,
  out_wedding_date date,
  out_venue text,
  out_rsvp_deadline date,
  out_timeline_share_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wp.id, wp.partner1_name, wp.partner2_name, wp.wedding_date, wp.venue,
    wp.rsvp_deadline, wp.timeline_share_enabled
  FROM wedding_profile wp
  WHERE
    (p_kind = 'rsvp'     AND wp.rsvp_slug = p_slug           AND wp.rsvp_enabled = true)
 OR (p_kind = 'countdown' AND wp.countdown_slug = p_slug     AND wp.countdown_enabled = true)
 OR (p_kind = 'timeline'  AND wp.timeline_share_slug = p_slug AND wp.timeline_share_enabled = true)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.public_wedding_by_slug(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_wedding_by_slug(text, text) TO anon, authenticated;

-- The two anon timeline policies read wedding_profile in a subquery, so they must
-- go through the definer helper before anon loses direct read on that table.
DROP POLICY IF EXISTS "Anon read shared timeline_events" ON public.timeline_events;
CREATE POLICY "Anon read shared timeline_events" ON public.timeline_events
  FOR SELECT TO anon, authenticated
  USING (timeline_share_is_open(wedding_id));

DROP POLICY IF EXISTS "Anon read shared timeline_assignments" ON public.timeline_assignments;
CREATE POLICY "Anon read shared timeline_assignments" ON public.timeline_assignments
  FOR SELECT TO anon, authenticated
  USING (timeline_share_is_open(wedding_id));

DROP POLICY IF EXISTS "Public read wedding for rsvp" ON public.wedding_profile;
REVOKE ALL ON TABLE public.wedding_profile FROM anon;
