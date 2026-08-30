-- Remove anon write access to guests and rsvp_responses.
-- Writes now go exclusively through the rsvp-submit edge function (service role),
-- which validates household membership server-side and enforces rate limiting + captcha.

-- Drop anon UPDATE on guests (was: rsvp_is_open(wedding_id) — let anyone update any guest)
DROP POLICY IF EXISTS "public_guest_update_open_wedding" ON public.guests;

-- Drop anon INSERT/UPDATE on rsvp_responses (was: rsvp_is_open(wedding_id))
DROP POLICY IF EXISTS "public_rsvp_insert_open_wedding" ON public.rsvp_responses;
DROP POLICY IF EXISTS "public_rsvp_update_open_wedding" ON public.rsvp_responses;

-- Keep: public_guest_select_open_wedding (anon can READ guests for RSVP search)
-- Keep: public_rsvp_select_open_wedding (anon can READ rsvp_responses)
-- Keep: all authenticated (owner) policies on both tables
