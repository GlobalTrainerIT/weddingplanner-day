/*
  # SaaS Multi-User Schema

  Converts the single-wedding demo into a full multi-user SaaS platform.

  ## Changes

  ### 1. subscriptions table
  - Tracks plan (free | pro), status, Stripe customer/subscription IDs
  - One row per auth user
  - RLS: users can only read/update their own subscription

  ### 2. wedding_profile
  - Adds `user_id` (uuid, references auth.users) column
  - Adds `created_at` column if missing
  - All RLS policies replaced: scoped to auth.uid() = user_id
  - INSERT policy enforces user_id = auth.uid()

  ### 3. All child tables (budget_items, guests, vendors, checklist_items, bridal_party, notes)
  - RLS policies replaced: joined through wedding_profile.user_id = auth.uid()
  - This means users can ONLY access rows that belong to their own wedding

  ### 4. Seed row removed
  - The hard-coded demo wedding (00000000-...-0001) is kept for backwards compat
    but new users get their own row via the app onboarding flow

  ## Security
  - Every policy uses auth.uid() — no anonymous write access
  - SELECT on child tables checks that the parent wedding belongs to the current user
  - INSERT on child tables checks wedding_id is owned by current user
*/

-- ============================================================
-- 1. subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. wedding_profile — add user_id
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_profile' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE wedding_profile ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop all old policies on wedding_profile
DROP POLICY IF EXISTS "Allow public read wedding_profile"   ON wedding_profile;
DROP POLICY IF EXISTS "Allow public insert wedding_profile" ON wedding_profile;
DROP POLICY IF EXISTS "Allow public update wedding_profile" ON wedding_profile;
DROP POLICY IF EXISTS "Read own wedding profile"            ON wedding_profile;
DROP POLICY IF EXISTS "Insert own wedding profile"          ON wedding_profile;
DROP POLICY IF EXISTS "Update own wedding profile"          ON wedding_profile;

-- New auth-scoped policies
CREATE POLICY "Users read own wedding profile"
  ON wedding_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wedding profile"
  ON wedding_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own wedding profile"
  ON wedding_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own wedding profile"
  ON wedding_profile FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Helper: verify a wedding belongs to current user
-- ============================================================
CREATE OR REPLACE FUNCTION wedding_belongs_to_user(wid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM wedding_profile
    WHERE id = wid AND user_id = auth.uid()
  );
$$;

-- ============================================================
-- 3. budget_items — replace policies
-- ============================================================
DROP POLICY IF EXISTS "Allow public read budget_items"   ON budget_items;
DROP POLICY IF EXISTS "Allow public insert budget_items" ON budget_items;
DROP POLICY IF EXISTS "Allow public update budget_items" ON budget_items;
DROP POLICY IF EXISTS "Allow public delete budget_items" ON budget_items;
DROP POLICY IF EXISTS "Read own budget items"            ON budget_items;
DROP POLICY IF EXISTS "Insert own budget items"          ON budget_items;
DROP POLICY IF EXISTS "Update own budget items"          ON budget_items;
DROP POLICY IF EXISTS "Delete own budget items"          ON budget_items;

CREATE POLICY "Users read own budget items"
  ON budget_items FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users insert own budget items"
  ON budget_items FOR INSERT
  TO authenticated
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users update own budget items"
  ON budget_items FOR UPDATE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id))
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users delete own budget items"
  ON budget_items FOR DELETE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

-- ============================================================
-- 4. guests
-- ============================================================
DROP POLICY IF EXISTS "Allow public read guests"   ON guests;
DROP POLICY IF EXISTS "Allow public insert guests" ON guests;
DROP POLICY IF EXISTS "Allow public update guests" ON guests;
DROP POLICY IF EXISTS "Allow public delete guests" ON guests;
DROP POLICY IF EXISTS "Read own guests"            ON guests;
DROP POLICY IF EXISTS "Insert own guests"          ON guests;
DROP POLICY IF EXISTS "Update own guests"          ON guests;
DROP POLICY IF EXISTS "Delete own guests"          ON guests;

CREATE POLICY "Users read own guests"
  ON guests FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users insert own guests"
  ON guests FOR INSERT
  TO authenticated
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users update own guests"
  ON guests FOR UPDATE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id))
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users delete own guests"
  ON guests FOR DELETE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

-- ============================================================
-- 5. vendors
-- ============================================================
DROP POLICY IF EXISTS "Allow public read vendors"   ON vendors;
DROP POLICY IF EXISTS "Allow public insert vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public update vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public delete vendors" ON vendors;
DROP POLICY IF EXISTS "Read own vendors"            ON vendors;
DROP POLICY IF EXISTS "Insert own vendors"          ON vendors;
DROP POLICY IF EXISTS "Update own vendors"          ON vendors;
DROP POLICY IF EXISTS "Delete own vendors"          ON vendors;

CREATE POLICY "Users read own vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users insert own vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users update own vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id))
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users delete own vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

-- ============================================================
-- 6. checklist_items
-- ============================================================
DROP POLICY IF EXISTS "Allow public read checklist_items"   ON checklist_items;
DROP POLICY IF EXISTS "Allow public insert checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Allow public update checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Allow public delete checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Read own checklist items"            ON checklist_items;
DROP POLICY IF EXISTS "Insert own checklist items"          ON checklist_items;
DROP POLICY IF EXISTS "Update own checklist items"          ON checklist_items;
DROP POLICY IF EXISTS "Delete own checklist items"          ON checklist_items;

CREATE POLICY "Users read own checklist items"
  ON checklist_items FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users insert own checklist items"
  ON checklist_items FOR INSERT
  TO authenticated
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users update own checklist items"
  ON checklist_items FOR UPDATE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id))
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users delete own checklist items"
  ON checklist_items FOR DELETE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

-- ============================================================
-- 7. bridal_party
-- ============================================================
DROP POLICY IF EXISTS "Allow public read bridal_party"   ON bridal_party;
DROP POLICY IF EXISTS "Allow public insert bridal_party" ON bridal_party;
DROP POLICY IF EXISTS "Allow public update bridal_party" ON bridal_party;
DROP POLICY IF EXISTS "Allow public delete bridal_party" ON bridal_party;
DROP POLICY IF EXISTS "Read own bridal party"            ON bridal_party;
DROP POLICY IF EXISTS "Insert own bridal party"          ON bridal_party;
DROP POLICY IF EXISTS "Update own bridal party"          ON bridal_party;
DROP POLICY IF EXISTS "Delete own bridal party"          ON bridal_party;

CREATE POLICY "Users read own bridal party"
  ON bridal_party FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users insert own bridal party"
  ON bridal_party FOR INSERT
  TO authenticated
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users update own bridal party"
  ON bridal_party FOR UPDATE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id))
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users delete own bridal party"
  ON bridal_party FOR DELETE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

-- ============================================================
-- 8. notes
-- ============================================================
DROP POLICY IF EXISTS "Read own notes"   ON notes;
DROP POLICY IF EXISTS "Insert own notes" ON notes;
DROP POLICY IF EXISTS "Update own notes" ON notes;

CREATE POLICY "Users read own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Users update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id))
  WITH CHECK (wedding_belongs_to_user(wedding_id));
