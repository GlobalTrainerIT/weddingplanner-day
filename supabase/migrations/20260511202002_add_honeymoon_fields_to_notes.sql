/*
  # Add honeymoon destination and budget fields to notes table

  Extends the notes table with two new columns so the Honeymoon
  page can persist the destination and budget across sessions.

  - `honeymoon_destination` (text) — free-form destination name
  - `honeymoon_budget` (numeric) — planned honeymoon budget
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'honeymoon_destination'
  ) THEN
    ALTER TABLE notes ADD COLUMN honeymoon_destination text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notes' AND column_name = 'honeymoon_budget'
  ) THEN
    ALTER TABLE notes ADD COLUMN honeymoon_budget numeric(12,2) DEFAULT 0;
  END IF;
END $$;
