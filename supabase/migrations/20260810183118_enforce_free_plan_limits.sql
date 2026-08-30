CREATE OR REPLACE FUNCTION public.is_pro_wedding(wid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM wedding_profile wp
    JOIN subscriptions s ON s.user_id = wp.user_id
    WHERE wp.id = wid
      AND s.plan <> 'free'
      AND s.status IN ('active', 'trialing')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_pro_wedding(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_pro_wedding(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_free_guest_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guest_count integer;
BEGIN
  IF public.is_pro_wedding(NEW.wedding_id) THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO guest_count FROM guests WHERE wedding_id = NEW.wedding_id;
  IF guest_count >= 25 THEN
    RAISE EXCEPTION 'Free plan guest limit reached';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_guest_limit ON public.guests;
CREATE TRIGGER trg_enforce_free_guest_limit
  BEFORE INSERT ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_guest_limit();

CREATE OR REPLACE FUNCTION public.enforce_free_vendor_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vendor_count integer;
BEGIN
  IF public.is_pro_wedding(NEW.wedding_id) THEN
    RETURN NEW;
  END IF;
  SELECT count(*) INTO vendor_count FROM vendors WHERE wedding_id = NEW.wedding_id;
  IF vendor_count >= 5 THEN
    RAISE EXCEPTION 'Free plan vendor limit reached';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_vendor_limit ON public.vendors;
CREATE TRIGGER trg_enforce_free_vendor_limit
  BEFORE INSERT ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.enforce_free_vendor_limit();