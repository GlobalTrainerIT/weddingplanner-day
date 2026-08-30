/*
# Enforce the Pro-only planning modules on the server

1. Problem
   Seating chart, bridal party and day-of timeline are Pro-only features, but
   the restriction lived only in the browser sidebar. A free-plan account could
   call the data API directly and create rows in those tables.

2. Change
   Adds a BEFORE INSERT trigger to `seating_tables`, `seating_objects`,
   `seating_rules`, `bridal_party` and `timeline_events` that rejects new rows
   for weddings on the free plan, mirroring the existing guest and vendor
   limit triggers.

3. Important notes
   1. Only INSERT is gated. Existing rows stay readable, editable and
      deletable, so nobody loses data or access to work already done.
   2. `is_pro_wedding` is the same helper the guest/vendor limits already use.
*/

CREATE OR REPLACE FUNCTION public.enforce_pro_only_feature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_pro_wedding(NEW.wedding_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'This feature requires a Pro plan';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_pro_only_feature() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_pro_only_seating_tables ON public.seating_tables;
CREATE TRIGGER trg_pro_only_seating_tables
  BEFORE INSERT ON public.seating_tables
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_only_feature();

DROP TRIGGER IF EXISTS trg_pro_only_seating_objects ON public.seating_objects;
CREATE TRIGGER trg_pro_only_seating_objects
  BEFORE INSERT ON public.seating_objects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_only_feature();

DROP TRIGGER IF EXISTS trg_pro_only_seating_rules ON public.seating_rules;
CREATE TRIGGER trg_pro_only_seating_rules
  BEFORE INSERT ON public.seating_rules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_only_feature();

DROP TRIGGER IF EXISTS trg_pro_only_bridal_party ON public.bridal_party;
CREATE TRIGGER trg_pro_only_bridal_party
  BEFORE INSERT ON public.bridal_party
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_only_feature();

DROP TRIGGER IF EXISTS trg_pro_only_timeline_events ON public.timeline_events;
CREATE TRIGGER trg_pro_only_timeline_events
  BEFORE INSERT ON public.timeline_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_only_feature();
