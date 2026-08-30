/*
  # Remove anonymous reads of RSVP responses

  `public_rsvp_select_open_wedding` was scoped to the wedding rather than to the
  caller, so `rsvp_is_open(wedding_id)` was true for every row of every wedding
  that had RSVP turned on. Any visitor holding the anon key could page through
  every couple's RSVP replies, including guest messages.

  Nothing in the client reads this table: the public RSVP page matches guests
  through `rsvp_lookup()` and submits through the `rsvp-submit` edge function,
  which uses the service role and is unaffected by policies. Owners read their
  responses as `authenticated` through the wedding-membership policies.
*/

DROP POLICY IF EXISTS "public_rsvp_select_open_wedding" ON public.rsvp_responses;

REVOKE ALL ON TABLE public.rsvp_responses FROM anon;
