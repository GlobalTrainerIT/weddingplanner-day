/*
# Scope public share fields to the share kind that needs them

1. Problem
   `public_wedding_by_slug(p_slug, p_kind)` returned the same set of columns for
   every kind of share link. That meant a visitor holding only a countdown or
   timeline link also received:
   - `rsvp_slug`, the secret that unlocks the guest-name lookup, and
   - `website_content`, the wedding website draft, even when the website has
     never been published.

2. Change
   The function now returns `website_content`, `rsvp_slug` and `rsvp_enabled`
   only when `p_kind = 'website'` (the only caller that uses them) and NULL
   for every other kind. No columns were added or removed, so all existing
   callers keep working.

3. Security
   - Closes the path from a public countdown/timeline link to the private RSVP
     link and, through it, to the guest list.
   - Stops unpublished wedding website content from being served.
*/

CREATE OR REPLACE FUNCTION public.public_wedding_by_slug(p_slug text, p_kind text)
RETURNS TABLE(
  out_id uuid,
  out_partner1_name text,
  out_partner2_name text,
  out_wedding_date date,
  out_venue text,
  out_rsvp_deadline date,
  out_timeline_share_enabled boolean,
  out_theme text,
  out_color_palette text,
  out_website_content jsonb,
  out_rsvp_slug text,
  out_rsvp_enabled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
SELECT
  wp.id,
  wp.partner1_name,
  wp.partner2_name,
  wp.wedding_date,
  wp.venue,
  wp.rsvp_deadline,
  wp.timeline_share_enabled,
  wp.theme,
  wp.color_palette,
  CASE WHEN p_kind = 'website' THEN wp.website_content ELSE NULL::jsonb END,
  CASE WHEN p_kind = 'website' THEN wp.rsvp_slug ELSE NULL::text END,
  CASE WHEN p_kind = 'website' THEN wp.rsvp_enabled ELSE false END
FROM wedding_profile wp
WHERE (p_kind = 'rsvp' AND wp.rsvp_slug = p_slug AND wp.rsvp_enabled = true)
   OR (p_kind = 'countdown' AND wp.countdown_slug = p_slug AND wp.countdown_enabled = true)
   OR (p_kind = 'timeline' AND wp.timeline_share_slug = p_slug AND wp.timeline_share_enabled = true)
   OR (p_kind = 'website' AND wp.website_slug = p_slug AND wp.website_enabled = true)
LIMIT 1;
$$;
