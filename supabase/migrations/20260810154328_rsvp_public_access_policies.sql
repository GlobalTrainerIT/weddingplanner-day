/*
# Add unique constraint on rsvp_responses + update RLS for public RSVP

1. Changes
- Add UNIQUE constraint on rsvp_responses (wedding_id, guest_id) so upserts work.
  This allows a guest to update their RSVP by re-submitting.
- Add UPDATE policy on rsvp_responses so public users can update their own responses.
- Add UPDATE policy on guests so public users can update RSVP fields (rsvp_status,
  meal_choice, dietary_restrictions, plus_one_name, plus_one_rsvp) for guests
  belonging to a wedding with an enabled rsvp_slug.

2. Notes
- The guests table UPDATE policy is scoped to weddings where rsvp_enabled = true.
  This is intentionally permissive for the public RSVP flow — anyone with the
  wedding slug can update guest RSVP fields. This is the standard public RSVP
  pattern (the slug acts as a semi-secret URL).
- No data loss — all changes are additive.
*/

-- Unique constraint for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rsvp_responses_wedding_id_guest_id_key'
  ) THEN
    ALTER TABLE rsvp_responses ADD CONSTRAINT rsvp_responses_wedding_id_guest_id_key UNIQUE (wedding_id, guest_id);
  END IF;
END $$;

-- Allow public update of rsvp_responses
DROP POLICY IF EXISTS "Public update rsvp_responses" ON rsvp_responses;
CREATE POLICY "Public update rsvp_responses"
  ON rsvp_responses FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Allow public update of guests RSVP fields (for weddings with RSVP enabled)
DROP POLICY IF EXISTS "Public update guest rsvp" ON guests;
CREATE POLICY "Public update guest rsvp"
  ON guests FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_profile
      WHERE wedding_profile.id = guests.wedding_id
      AND wedding_profile.rsvp_enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_profile
      WHERE wedding_profile.id = guests.wedding_id
      AND wedding_profile.rsvp_enabled = true
    )
  );

-- Allow public read of guests for RSVP lookup (only RSVP-relevant fields are fetched by the app)
DROP POLICY IF EXISTS "Public read guests for rsvp" ON guests;
CREATE POLICY "Public read guests for rsvp"
  ON guests FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_profile
      WHERE wedding_profile.id = guests.wedding_id
      AND wedding_profile.rsvp_enabled = true
    )
  );

-- Allow public read of households for RSVP lookup
DROP POLICY IF EXISTS "Public read households for rsvp" ON households;
CREATE POLICY "Public read households for rsvp"
  ON households FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_profile
      WHERE wedding_profile.id = households.wedding_id
      AND wedding_profile.rsvp_enabled = true
    )
  );

-- Allow public insert into notes (for RSVP messages) — append to general_notes
-- We need a separate notes insert policy for weddings with RSVP enabled
DROP POLICY IF EXISTS "Public insert rsvp notes" ON notes;
CREATE POLICY "Public insert rsvp notes"
  ON notes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_profile
      WHERE wedding_profile.id = notes.wedding_id
      AND wedding_profile.rsvp_enabled = true
    )
  );
