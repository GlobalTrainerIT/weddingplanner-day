-- F1: the client must not be able to set its own plan.
DROP POLICY IF EXISTS "Users insert own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON subscriptions;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename='subscriptions' AND cmd IN ('INSERT','UPDATE')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.subscriptions', p.policyname);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;

-- Provision the free row through a function that hard-codes the plan.
CREATE OR REPLACE FUNCTION public.ensure_free_subscription()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO subscriptions (user_id, plan, status)
  VALUES (auth.uid(), 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_free_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_free_subscription() TO authenticated;
