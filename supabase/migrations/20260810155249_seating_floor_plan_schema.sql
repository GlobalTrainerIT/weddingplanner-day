/*
# Seating chart floor plan — tables, objects, rules, seat assignments

1. New Tables
- `seating_tables` — one row per table object on the floor plan canvas.
  Stores shape, position, rotation, dimensions, label, and capacity.
  Persisted so the layout survives reloads.
- `seating_objects` — non-table objects (dance floor, bar, stage, cake table, DJ).
  Stored separately because they have no seats/guests — just position + size + label.
- `seating_rules` — "seat together" and "keep apart" rules between guests or
  households, used for live conflict warnings and auto-arrange.

2. Modified Tables
- `guests` — add `seat_number int` for per-seat assignment within a table.
  `table_number` (existing) identifies the table; `seat_number` identifies the
  specific seat at that table. Both nullable — null means unassigned.

3. Security
- RLS enabled on all new tables with owner-scoped policies through
  wedding_profile.user_id = auth.uid().
- No changes to existing guests policies (table_number already covered).

4. Notes
- All additions are additive (IF NOT EXISTS). No data loss.
- seating_tables and seating_objects store canvas coordinates (x, y) in a
  virtual coordinate system (1 unit = 1 px at 100% zoom), rotation in degrees,
  and width/height for rectangular shapes. Round tables use width as diameter.
*/

-- 1. seating_tables
CREATE TABLE IF NOT EXISTS seating_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Table',
  shape text NOT NULL DEFAULT 'round' CHECK (shape IN ('round','rectangle','head','sweetheart')),
  capacity int NOT NULL DEFAULT 8 CHECK (capacity > 0),
  x double precision NOT NULL DEFAULT 200,
  y double precision NOT NULL DEFAULT 200,
  rotation double precision NOT NULL DEFAULT 0,
  width double precision NOT NULL DEFAULT 120,
  height double precision NOT NULL DEFAULT 120,
  table_number int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_seating_tables" ON seating_tables;
CREATE POLICY "select_own_seating_tables"
  ON seating_tables FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_tables.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_seating_tables" ON seating_tables;
CREATE POLICY "insert_own_seating_tables"
  ON seating_tables FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_tables.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_seating_tables" ON seating_tables;
CREATE POLICY "update_own_seating_tables"
  ON seating_tables FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_tables.wedding_id AND wedding_profile.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_tables.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_seating_tables" ON seating_tables;
CREATE POLICY "delete_own_seating_tables"
  ON seating_tables FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_tables.wedding_id AND wedding_profile.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_seating_tables_wedding ON seating_tables(wedding_id);

-- 2. seating_objects
CREATE TABLE IF NOT EXISTS seating_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Object',
  object_type text NOT NULL DEFAULT 'dance_floor' CHECK (object_type IN ('dance_floor','bar','stage','cake_table','dj','other')),
  x double precision NOT NULL DEFAULT 300,
  y double precision NOT NULL DEFAULT 300,
  rotation double precision NOT NULL DEFAULT 0,
  width double precision NOT NULL DEFAULT 200,
  height double precision NOT NULL DEFAULT 100,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seating_objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_seating_objects" ON seating_objects;
CREATE POLICY "select_own_seating_objects"
  ON seating_objects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_objects.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_seating_objects" ON seating_objects;
CREATE POLICY "insert_own_seating_objects"
  ON seating_objects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_objects.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_seating_objects" ON seating_objects;
CREATE POLICY "update_own_seating_objects"
  ON seating_objects FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_objects.wedding_id AND wedding_profile.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_objects.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_seating_objects" ON seating_objects;
CREATE POLICY "delete_own_seating_objects"
  ON seating_objects FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_objects.wedding_id AND wedding_profile.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_seating_objects_wedding ON seating_objects(wedding_id);

-- 3. seating_rules
CREATE TABLE IF NOT EXISTS seating_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  rule_type text NOT NULL DEFAULT 'together' CHECK (rule_type IN ('together','apart')),
  scope text NOT NULL DEFAULT 'guest' CHECK (scope IN ('guest','household')),
  guest_a_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  guest_b_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  household_a_id uuid REFERENCES households(id) ON DELETE CASCADE,
  household_b_id uuid REFERENCES households(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (scope = 'guest' AND guest_a_id IS NOT NULL AND guest_b_id IS NOT NULL) OR
    (scope = 'household' AND household_a_id IS NOT NULL AND household_b_id IS NOT NULL)
  )
);

ALTER TABLE seating_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_seating_rules" ON seating_rules;
CREATE POLICY "select_own_seating_rules"
  ON seating_rules FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_rules.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "insert_own_seating_rules" ON seating_rules;
CREATE POLICY "insert_own_seating_rules"
  ON seating_rules FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_rules.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "update_own_seating_rules" ON seating_rules;
CREATE POLICY "update_own_seating_rules"
  ON seating_rules FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_rules.wedding_id AND wedding_profile.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_rules.wedding_id AND wedding_profile.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_seating_rules" ON seating_rules;
CREATE POLICY "delete_own_seating_rules"
  ON seating_rules FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile WHERE wedding_profile.id = seating_rules.wedding_id AND wedding_profile.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_seating_rules_wedding ON seating_rules(wedding_id);

-- 4. guests — add seat_number
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'seat_number') THEN
    ALTER TABLE guests ADD COLUMN seat_number int;
  END IF;
END $$;
