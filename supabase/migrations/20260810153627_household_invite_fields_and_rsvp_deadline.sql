/*
# Household invite tracking + RSVP deadline

1. Modified Tables
- `households` — add invite_method (email/post), invite_sent, thank_you_sent
  columns for household-level invitation tracking.
- `wedding_profile` — add rsvp_deadline (date) for locking public RSVP page.

2. New Columns
- households.invite_method text DEFAULT 'post' — 'email' or 'post'
- households.invite_sent boolean DEFAULT false
- households.thank_you_sent boolean DEFAULT false
- wedding_profile.rsvp_deadline date NULL — when set, RSVP page locks after this date

3. Security
- No new tables. Existing RLS policies on households and wedding_profile
  already cover the new columns (column-level privileges inherit from table policies).

4. Notes
- All additions are additive (IF NOT EXISTS). No data loss.
- invite_method defaults to 'post' since most wedding invitations are mailed.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'invite_method') THEN
    ALTER TABLE households ADD COLUMN invite_method text NOT NULL DEFAULT 'post';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'invite_sent') THEN
    ALTER TABLE households ADD COLUMN invite_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'thank_you_sent') THEN
    ALTER TABLE households ADD COLUMN thank_you_sent boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wedding_profile' AND column_name = 'rsvp_deadline') THEN
    ALTER TABLE wedding_profile ADD COLUMN rsvp_deadline date;
  END IF;
END $$;

-- Add plus_one_allowed to guests if not present (distinct from has_plus_one:
-- has_plus_one = they have one assigned, plus_one_allowed = household can bring a plus-one)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'guests' AND column_name = 'plus_one_allowed') THEN
    ALTER TABLE guests ADD COLUMN plus_one_allowed boolean NOT NULL DEFAULT false;
  END IF;
END $$;
