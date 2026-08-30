/*
  # Phase 2: Real dates, owners, payment schedule, currency & vendor pipeline

  ## Plain-English summary

  This migration upgrades the data model so that:
  - Every checklist task can have a real due date (computed from the wedding date),
    an assignee (partner_1 / partner_2 / planner / other), a completion timestamp,
    and a notes field. A flag tracks whether the user overrode the auto-computed date.
  - Every budget item can be linked to a vendor, tagged with who pays (couple,
    partner 1 family, partner 2 family, other), and have multiple payments
    (deposit, second payment, final, etc.) tracked in a sub-table.
  - The wedding record gets a currency code + symbol so all money values are
    formatted consistently instead of hard-coded "$".
  - Vendors get a proper status pipeline (researching → contacted → quoted →
    booked → completed), contact details, contract tracking, and notes.
  - Households are introduced for the guest list overhaul (household-level
    invitations/RSVPs, guest-level headcounts).

  ## New tables
  - `budget_payments` — payment schedule per budget item
    (label, amount, due_date, paid_at, method_note)
  - `households` — grouping guests for household-level invitations/RSVPs
    (name, mailing address, RSVP deadline override)

  ## Modified tables (additive only — no data loss)
  - `checklist_items` + due_date, assignee, assignee_name, overridden
  - `budget_items` + paid_by (replaces the single deposit_paid model going forward;
    old deposit_paid column is kept for backwards compat)
  - `vendors` + category, contact_name, email, phone, website, status,
    contract_signed, contract_file_path, notes
    (many of these columns already exist from the original schema; this migration
    is idempotent so it only adds what's missing)
  - `wedding_profile` + currency_code, currency_symbol, hero_image_path
  - `guests` + household_id, age_group, relationship, side (already exists)

  ## Security
  - RLS enabled on all new tables (budget_payments, households)
  - Policies scoped through wedding_belongs_to_user() — same pattern as existing child tables
  - No changes to existing policies

  ## Important notes
  1. This migration is idempotent — safe to re-run.
  2. The existing `deposit_paid` column on budget_items is preserved; the new
     `budget_payments` table is the source of truth going forward, but old data
     remains readable.
  3. The existing `vendors` table already has most of the columns from the
     original schema; this migration only adds what's missing.
  4. `completed_at` already exists on checklist_items; this migration adds
     `due_date`, `assignee`, `assignee_name`, and `overridden`.
*/

-- ============================================================
-- 1. wedding_profile — add currency and hero image
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wedding_profile' AND column_name = 'currency_code') THEN
    ALTER TABLE wedding_profile ADD COLUMN currency_code text NOT NULL DEFAULT 'USD';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wedding_profile' AND column_name = 'currency_symbol') THEN
    ALTER TABLE wedding_profile ADD COLUMN currency_symbol text NOT NULL DEFAULT '$';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wedding_profile' AND column_name = 'hero_image_path') THEN
    ALTER TABLE wedding_profile ADD COLUMN hero_image_path text;
  END IF;
END $$;

-- ============================================================
-- 2. checklist_items — add due_date, assignee, overridden
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_items' AND column_name = 'due_date') THEN
    ALTER TABLE checklist_items ADD COLUMN due_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_items' AND column_name = 'assignee') THEN
    ALTER TABLE checklist_items ADD COLUMN assignee text DEFAULT 'partner_1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_items' AND column_name = 'assignee_name') THEN
    ALTER TABLE checklist_items ADD COLUMN assignee_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_items' AND column_name = 'overridden') THEN
    ALTER TABLE checklist_items ADD COLUMN overridden boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checklist_items_due_date ON checklist_items(due_date);

-- ============================================================
-- 3. budget_items — add paid_by
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budget_items' AND column_name = 'paid_by') THEN
    ALTER TABLE budget_items ADD COLUMN paid_by text NOT NULL DEFAULT 'couple';
  END IF;
END $$;

-- ============================================================
-- 4. budget_payments — new payment schedule sub-table
-- ============================================================
CREATE TABLE IF NOT EXISTS budget_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_item_id uuid REFERENCES budget_items(id) ON DELETE CASCADE NOT NULL,
  label text NOT NULL DEFAULT 'Deposit',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date,
  paid_at timestamptz,
  method_note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE budget_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own budget payments" ON budget_payments;
CREATE POLICY "Users read own budget payments"
  ON budget_payments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budget_items bi
    JOIN wedding_profile wp ON bi.wedding_id = wp.id
    WHERE bi.id = budget_payments.budget_item_id AND wp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users insert own budget payments" ON budget_payments;
CREATE POLICY "Users insert own budget payments"
  ON budget_payments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_items bi
    JOIN wedding_profile wp ON bi.wedding_id = wp.id
    WHERE bi.id = budget_payments.budget_item_id AND wp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users update own budget payments" ON budget_payments;
CREATE POLICY "Users update own budget payments"
  ON budget_payments FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budget_items bi
    JOIN wedding_profile wp ON bi.wedding_id = wp.id
    WHERE bi.id = budget_payments.budget_item_id AND wp.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM budget_items bi
    JOIN wedding_profile wp ON bi.wedding_id = wp.id
    WHERE bi.id = budget_payments.budget_item_id AND wp.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users delete own budget payments" ON budget_payments;
CREATE POLICY "Users delete own budget payments"
  ON budget_payments FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM budget_items bi
    JOIN wedding_profile wp ON bi.wedding_id = wp.id
    WHERE bi.id = budget_payments.budget_item_id AND wp.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_budget_payments_item ON budget_payments(budget_item_id);
CREATE INDEX IF NOT EXISTS idx_budget_payments_due ON budget_payments(due_date);

-- ============================================================
-- 5. vendors — ensure all Phase 2 columns exist (idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'category') THEN
    ALTER TABLE vendors ADD COLUMN category text NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contact_name') THEN
    ALTER TABLE vendors ADD COLUMN contact_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'email') THEN
    ALTER TABLE vendors ADD COLUMN email text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'phone') THEN
    ALTER TABLE vendors ADD COLUMN phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'website') THEN
    ALTER TABLE vendors ADD COLUMN website text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'status') THEN
    ALTER TABLE vendors ADD COLUMN status text NOT NULL DEFAULT 'researching';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contract_signed') THEN
    ALTER TABLE vendors ADD COLUMN contract_signed boolean NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'contract_file_path') THEN
    ALTER TABLE vendors ADD COLUMN contract_file_path text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'notes') THEN
    ALTER TABLE vendors ADD COLUMN notes text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- ============================================================
-- 6. households — new table for household-level guest grouping
-- ============================================================
CREATE TABLE IF NOT EXISTS households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  zip text DEFAULT '',
  country text DEFAULT 'US',
  rsvp_status text DEFAULT 'pending',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own households" ON households;
CREATE POLICY "Users read own households"
  ON households FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

DROP POLICY IF EXISTS "Users insert own households" ON households;
CREATE POLICY "Users insert own households"
  ON households FOR INSERT
  TO authenticated
  WITH CHECK (wedding_belongs_to_user(wedding_id));

DROP POLICY IF EXISTS "Users update own households" ON households;
CREATE POLICY "Users update own households"
  ON households FOR UPDATE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id))
  WITH CHECK (wedding_belongs_to_user(wedding_id));

DROP POLICY IF EXISTS "Users delete own households" ON households;
CREATE POLICY "Users delete own households"
  ON households FOR DELETE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

-- ============================================================
-- 7. guests — add household_id and age_group
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'household_id') THEN
    ALTER TABLE guests ADD COLUMN household_id uuid REFERENCES households(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'age_group') THEN
    ALTER TABLE guests ADD COLUMN age_group text NOT NULL DEFAULT 'adult';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'relationship') THEN
    ALTER TABLE guests ADD COLUMN relationship text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_guests_household ON guests(household_id);
