/*
# Revoke table privileges the signed-out role never needs

1. Problem
   The `anon` role held SELECT/INSERT/UPDATE/DELETE on many tables whose row
   level security policies are all scoped to signed-in users. Row level
   security blocks those requests today, but the grants mean a single future
   policy written for `anon` would silently expose the whole table.

2. Change
   Revokes every `anon` privilege that no public surface uses, keeping exactly
   the two the app relies on:
   - INSERT on `leads` (the public checklist/budget tools capture an email)
   - SELECT on `timeline_events` and `timeline_assignments` (the public shared
     day-of timeline page)

3. Security
   Defence in depth only: nothing that works today stops working, because row
   level security already denied all of these.
*/

REVOKE ALL ON TABLE public.activity_feed FROM anon;
REVOKE ALL ON TABLE public.bridal_party FROM anon;
REVOKE ALL ON TABLE public.budget_items FROM anon;
REVOKE ALL ON TABLE public.budget_payments FROM anon;
REVOKE ALL ON TABLE public.checklist_items FROM anon;
REVOKE ALL ON TABLE public.comment_reads FROM anon;
REVOKE ALL ON TABLE public.comments FROM anon;
REVOKE ALL ON TABLE public.notification_log FROM anon;
REVOKE ALL ON TABLE public.notification_preferences FROM anon;
REVOKE ALL ON TABLE public.notifications FROM anon;
REVOKE ALL ON TABLE public.partner_invites FROM anon;
REVOKE ALL ON TABLE public.push_subscriptions FROM anon;
REVOKE ALL ON TABLE public.referrals FROM anon;
REVOKE ALL ON TABLE public.seating_objects FROM anon;
REVOKE ALL ON TABLE public.seating_rules FROM anon;
REVOKE ALL ON TABLE public.seating_tables FROM anon;
REVOKE ALL ON TABLE public.subscriptions FROM anon;

REVOKE ALL ON TABLE public.leads FROM anon;
GRANT INSERT ON TABLE public.leads TO anon;

REVOKE ALL ON TABLE public.timeline_events FROM anon;
GRANT SELECT ON TABLE public.timeline_events TO anon;

REVOKE ALL ON TABLE public.timeline_assignments FROM anon;
GRANT SELECT ON TABLE public.timeline_assignments TO anon;
