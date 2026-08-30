/*
# Wedding Website — public one-page site

## Purpose
Adds columns to `wedding_profile` to support a public wedding website at `/w/:slug`,
following the same slug + enabled-flag pattern as RSVP and countdown.

## New Columns on `wedding_profile`
1. `website_enabled` (boolean, default false) — toggles public access
2. `website_slug` (text, nullable) — unique URL slug for the public website
3. `website_content` (jsonb, nullable) — structured content for the website

## Modified RPC
- `public_wedding_by_slug` is dropped and recreated with additional return columns:
  out_theme, out_color_palette, out_website_content, out_rsvp_slug, out_rsvp_enabled
- Handles new `p_kind = 'website'` case
- Existing callers (rsvp, countdown, timeline) still work — extra columns are ignored

## Security
- No new tables. No new RLS policies.
- The RPC is SECURITY DEFINER and remains the ONLY way anon can read wedding data.
- The anon role still has NO direct SELECT on `wedding_profile`.
- Unique partial index on `website_slug` prevents collisions.
*/

-- 1. Add new columns
ALTER TABLE wedding_profile
  ADD COLUMN IF NOT EXISTS website_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE wedding_profile
  ADD COLUMN IF NOT EXISTS website_slug text;

ALTER TABLE wedding_profile
  ADD COLUMN IF NOT EXISTS website_content jsonb;

-- 2. Unique index on website_slug
CREATE UNIQUE INDEX IF NOT EXISTS wedding_profile_website_slug_key
  ON wedding_profile (website_slug)
  WHERE website_slug IS NOT NULL;

-- 3. Drop and recreate the public RPC with widened return type
DROP FUNCTION IF EXISTS public.public_wedding_by_slug(text, text);

CREATE FUNCTION public.public_wedding_by_slug(p_slug text, p_kind text)
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
STABLE SECURITY DEFINER
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
  wp.website_content,
  wp.rsvp_slug,
  wp.rsvp_enabled
FROM wedding_profile wp
WHERE
  (p_kind = 'rsvp'      AND wp.rsvp_slug = p_slug           AND wp.rsvp_enabled = true)
  OR (p_kind = 'countdown' AND wp.countdown_slug = p_slug   AND wp.countdown_enabled = true)
  OR (p_kind = 'timeline'  AND wp.timeline_share_slug = p_slug AND wp.timeline_share_enabled = true)
  OR (p_kind = 'website'   AND wp.website_slug = p_slug     AND wp.website_enabled = true)
LIMIT 1;
$$;
