/*
# Day Timeline run-sheet: events + assignments tables

1. New Tables
- `timeline_events` — DB-backed timeline events with start_time, duration_minutes,
  location, notes, category, sort_order.
- `timeline_assignments` — normalized attachment rows linking an event to
  either a vendor (vendor_id) or a person (free-text name + role).

2. Security
- RLS on both tables, scoped to wedding members (user_id OR partner_user_id).
- Public read access when timeline_share_enabled = true.
- No data loss — all additive.
*/

CREATE TABLE IF NOT EXISTS timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  start_time text NOT NULL DEFAULT '12:00',
  duration_minutes int NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  location text DEFAULT '',
  notes text DEFAULT '',
  category text NOT NULL DEFAULT 'Other' CHECK (category IN ('Prep','Photography','Ceremony','Reception','Other')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wedding members read timeline_events" ON timeline_events;
CREATE POLICY "Wedding members read timeline_events"
  ON timeline_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_events.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Anon read shared timeline_events" ON timeline_events;
CREATE POLICY "Anon read shared timeline_events"
  ON timeline_events FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_events.wedding_id AND wp.timeline_share_enabled = true));

DROP POLICY IF EXISTS "Wedding members insert timeline_events" ON timeline_events;
CREATE POLICY "Wedding members insert timeline_events"
  ON timeline_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_events.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Wedding members update timeline_events" ON timeline_events;
CREATE POLICY "Wedding members update timeline_events"
  ON timeline_events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_events.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_events.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Wedding members delete timeline_events" ON timeline_events;
CREATE POLICY "Wedding members delete timeline_events"
  ON timeline_events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_events.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

CREATE INDEX IF NOT EXISTS idx_timeline_events_wedding ON timeline_events(wedding_id, sort_order);

-- ============================================================

CREATE TABLE IF NOT EXISTS timeline_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_event_id uuid NOT NULL REFERENCES timeline_events(id) ON DELETE CASCADE,
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  assignee_type text NOT NULL CHECK (assignee_type IN ('vendor','person')),
  vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE,
  person_name text DEFAULT '',
  person_role text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CHECK (
    (assignee_type = 'vendor' AND vendor_id IS NOT NULL) OR
    (assignee_type = 'person' AND person_name IS NOT NULL AND person_name <> '')
  )
);

ALTER TABLE timeline_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wedding members read timeline_assignments" ON timeline_assignments;
CREATE POLICY "Wedding members read timeline_assignments"
  ON timeline_assignments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_assignments.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Anon read shared timeline_assignments" ON timeline_assignments;
CREATE POLICY "Anon read shared timeline_assignments"
  ON timeline_assignments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_assignments.wedding_id AND wp.timeline_share_enabled = true));

DROP POLICY IF EXISTS "Wedding members insert timeline_assignments" ON timeline_assignments;
CREATE POLICY "Wedding members insert timeline_assignments"
  ON timeline_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_assignments.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Wedding members update timeline_assignments" ON timeline_assignments;
CREATE POLICY "Wedding members update timeline_assignments"
  ON timeline_assignments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_assignments.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_assignments.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Wedding members delete timeline_assignments" ON timeline_assignments;
CREATE POLICY "Wedding members delete timeline_assignments"
  ON timeline_assignments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = timeline_assignments.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

CREATE INDEX IF NOT EXISTS idx_timeline_assignments_event ON timeline_assignments(timeline_event_id);
