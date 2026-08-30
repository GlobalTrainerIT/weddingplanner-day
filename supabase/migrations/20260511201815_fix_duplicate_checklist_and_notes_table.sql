/*
  # Fix duplicate checklist tasks & add notes persistence

  1. Checklist deduplication
    - Removes duplicate rows keeping only the earliest created_at per (wedding_id, task) pair
    - Adds a unique constraint on (wedding_id, task) to prevent future duplicates

  2. New Table: `notes`
    - Stores General Notes, Journal entry, and Gratitude text for a wedding
    - One row per wedding (upsert pattern)
    - RLS scoped to the fixed wedding ID
*/

-- ============================================================
-- Deduplicate checklist_items: keep oldest row per (wedding_id, task)
-- ============================================================
DELETE FROM checklist_items
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY wedding_id, task
             ORDER BY created_at ASC
           ) AS rn
    FROM checklist_items
  ) ranked
  WHERE rn > 1
);

-- Prevent future duplicates
ALTER TABLE checklist_items
  DROP CONSTRAINT IF EXISTS checklist_items_wedding_id_task_key;

ALTER TABLE checklist_items
  ADD CONSTRAINT checklist_items_wedding_id_task_key
  UNIQUE (wedding_id, task);

-- ============================================================
-- Notes table
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE,
  general_notes text DEFAULT '',
  journal text DEFAULT '',
  gratitude text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE (wedding_id)
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own notes"
  ON notes FOR SELECT
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Insert own notes"
  ON notes FOR INSERT
  TO anon, authenticated
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Update own notes"
  ON notes FOR UPDATE
  TO anon, authenticated
  USING (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (wedding_id = '00000000-0000-0000-0000-000000000001'::uuid);
