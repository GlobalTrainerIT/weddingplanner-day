/*
# Day Timeline run-sheet: add share columns to wedding_profile

1. Modified Tables
- `wedding_profile` — add timeline_share_slug (unique, revocable public link)
  and timeline_share_enabled (boolean toggle).
2. Notes
- Must run before timeline_events/assignments tables so policies can reference
  the new columns.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wedding_profile' AND column_name = 'timeline_share_slug') THEN
    ALTER TABLE wedding_profile ADD COLUMN timeline_share_slug text UNIQUE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wedding_profile' AND column_name = 'timeline_share_enabled') THEN
    ALTER TABLE wedding_profile ADD COLUMN timeline_share_enabled boolean DEFAULT false;
  END IF;
END $$;
