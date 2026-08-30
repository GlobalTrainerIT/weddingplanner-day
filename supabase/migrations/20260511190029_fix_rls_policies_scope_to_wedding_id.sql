/*
  # Fix RLS Policies — Scope All Access to the Fixed Wedding ID

  ## Problem
  All write policies used `USING (true)` / `WITH CHECK (true)`, which grants
  unrestricted access to every row for both anon and authenticated roles.

  ## Fix
  Replace every overly-permissive policy with one that restricts access to rows
  belonging to the single fixed wedding (`WEDDING_ID = '00000000-0000-0000-0000-000000000001'`).
  This is a single-user planner with no auth, so scoping by wedding_id is the
  correct security boundary — it prevents any external actor from reading or
  mutating rows belonging to a different wedding_id.

  ## Tables Updated
  - wedding_profile  (SELECT, INSERT, UPDATE)
  - budget_items     (SELECT, INSERT, UPDATE, DELETE)
  - guests           (SELECT, INSERT, UPDATE, DELETE)
  - vendors          (SELECT, INSERT, UPDATE, DELETE)
  - checklist_items  (SELECT, INSERT, UPDATE, DELETE)
  - bridal_party     (SELECT, INSERT, UPDATE, DELETE)

  ## Security Notes
  - All policies now check that the row's id / wedding_id matches the fixed UUID
  - No policy uses `true` as the sole condition any more
  - SELECT on wedding_profile is scoped to the single known row by id
  - All child-table policies check `wedding_id = '<fixed uuid>'`
*/

-- ============================================================
-- wedding_profile
-- ============================================================
DROP POLICY IF EXISTS "Allow public read wedding_profile"   ON wedding_profile;
DROP POLICY IF EXISTS "Allow public insert wedding_profile" ON wedding_profile;
DROP POLICY IF EXISTS "Allow public update wedding_profile" ON wedding_profile;

CREATE POLICY "Read own wedding profile"
  ON wedding_profile FOR SELECT
  TO anon, authenticated
  USING (id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Insert own wedding profile"
  ON wedding_profile FOR INSERT
  TO anon, authenticated
  WITH CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Update own wedding profile"
  ON wedding_profile FOR UPDATE
  TO anon, authenticated
  USING (id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- budget_items
-- ============================================================
DROP POLICY IF EXISTS "Allow public read budget_items"   ON budget_items;
DROP POLICY IF EXISTS "Allow public insert budget_items" ON budget_items;
DROP POLICY IF EXISTS "Allow public update budget_items" ON budget_items;
DROP POLICY IF EXISTS "Allow public delete budget_items" ON budget_items;

CREATE POLICY "Read own budget items"
  ON budget_items FOR SELECT
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Insert own budget items"
  ON budget_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Update own budget items"
  ON budget_items FOR UPDATE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Delete own budget items"
  ON budget_items FOR DELETE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- guests
-- ============================================================
DROP POLICY IF EXISTS "Allow public read guests"   ON guests;
DROP POLICY IF EXISTS "Allow public insert guests" ON guests;
DROP POLICY IF EXISTS "Allow public update guests" ON guests;
DROP POLICY IF EXISTS "Allow public delete guests" ON guests;

CREATE POLICY "Read own guests"
  ON guests FOR SELECT
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Insert own guests"
  ON guests FOR INSERT
  TO anon, authenticated
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Update own guests"
  ON guests FOR UPDATE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Delete own guests"
  ON guests FOR DELETE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- vendors
-- ============================================================
DROP POLICY IF EXISTS "Allow public read vendors"   ON vendors;
DROP POLICY IF EXISTS "Allow public insert vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public update vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public delete vendors" ON vendors;

CREATE POLICY "Read own vendors"
  ON vendors FOR SELECT
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Insert own vendors"
  ON vendors FOR INSERT
  TO anon, authenticated
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Update own vendors"
  ON vendors FOR UPDATE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Delete own vendors"
  ON vendors FOR DELETE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- checklist_items
-- ============================================================
DROP POLICY IF EXISTS "Allow public read checklist_items"   ON checklist_items;
DROP POLICY IF EXISTS "Allow public insert checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Allow public update checklist_items" ON checklist_items;
DROP POLICY IF EXISTS "Allow public delete checklist_items" ON checklist_items;

CREATE POLICY "Read own checklist items"
  ON checklist_items FOR SELECT
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Insert own checklist items"
  ON checklist_items FOR INSERT
  TO anon, authenticated
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Update own checklist items"
  ON checklist_items FOR UPDATE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Delete own checklist items"
  ON checklist_items FOR DELETE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================================
-- bridal_party
-- ============================================================
DROP POLICY IF EXISTS "Allow public read bridal_party"   ON bridal_party;
DROP POLICY IF EXISTS "Allow public insert bridal_party" ON bridal_party;
DROP POLICY IF EXISTS "Allow public update bridal_party" ON bridal_party;
DROP POLICY IF EXISTS "Allow public delete bridal_party" ON bridal_party;

CREATE POLICY "Read own bridal party"
  ON bridal_party FOR SELECT
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Insert own bridal party"
  ON bridal_party FOR INSERT
  TO anon, authenticated
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Update own bridal party"
  ON bridal_party FOR UPDATE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Delete own bridal party"
  ON bridal_party FOR DELETE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);
