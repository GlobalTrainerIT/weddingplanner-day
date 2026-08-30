REVOKE SELECT, INSERT, UPDATE, DELETE ON public.wedding_profile FROM anon;

GRANT SELECT (
  id,
  partner1_name,
  partner2_name,
  wedding_date,
  venue,
  rsvp_deadline,
  rsvp_enabled,
  rsvp_slug,
  countdown_enabled,
  countdown_slug,
  timeline_share_enabled,
  timeline_share_slug
) ON public.wedding_profile TO anon;