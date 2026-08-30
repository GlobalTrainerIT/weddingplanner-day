
-- ============================================================
-- 1. Add rsvp_slug + countdown fields to wedding_profile
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_profile' AND column_name='rsvp_slug') THEN
    ALTER TABLE wedding_profile ADD COLUMN rsvp_slug text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_profile' AND column_name='rsvp_enabled') THEN
    ALTER TABLE wedding_profile ADD COLUMN rsvp_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_profile' AND column_name='countdown_slug') THEN
    ALTER TABLE wedding_profile ADD COLUMN countdown_slug text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_profile' AND column_name='countdown_enabled') THEN
    ALTER TABLE wedding_profile ADD COLUMN countdown_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_profile' AND column_name='referral_code') THEN
    ALTER TABLE wedding_profile ADD COLUMN referral_code text UNIQUE;
  END IF;
END $$;

-- ============================================================
-- 2. rsvp_responses (public writes, no auth required)
-- ============================================================
CREATE TABLE IF NOT EXISTS rsvp_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES wedding_profile(id) ON DELETE CASCADE NOT NULL,
  guest_id uuid REFERENCES guests(id) ON DELETE CASCADE,
  guest_name text NOT NULL,
  rsvp_status text NOT NULL CHECK (rsvp_status IN ('attending','declined','maybe')),
  meal_choice text DEFAULT '',
  dietary_restrictions text DEFAULT '',
  plus_one_attending boolean DEFAULT false,
  plus_one_name text DEFAULT '',
  message text DEFAULT '',
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can read rsvp_responses for a public wedding (needed to show "already responded")
CREATE POLICY "Public read rsvp_responses"
  ON rsvp_responses FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM wedding_profile WHERE id = wedding_id AND rsvp_enabled = true)
  );

-- Anyone can submit an RSVP for a public wedding
CREATE POLICY "Public insert rsvp_responses"
  ON rsvp_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM wedding_profile WHERE id = wedding_id AND rsvp_enabled = true)
  );

-- Wedding owners can read/delete all responses for their wedding
CREATE POLICY "Owner read rsvp_responses"
  ON rsvp_responses FOR SELECT
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

CREATE POLICY "Owner delete rsvp_responses"
  ON rsvp_responses FOR DELETE
  TO authenticated
  USING (wedding_belongs_to_user(wedding_id));

-- ============================================================
-- 3. leads (email capture from public tools)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  wedding_date date,
  source text NOT NULL DEFAULT 'tool',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a lead (public tools, no login)
CREATE POLICY "Public insert leads"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only service role can read leads (admin access only)

-- ============================================================
-- 4. referrals
-- ============================================================
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  referral_code text NOT NULL,
  signed_up_at timestamptz DEFAULT now()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referrals"
  ON referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_user_id);

CREATE POLICY "Service insert referrals"
  ON referrals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================
-- 5. Public read on wedding_profile for RSVP/countdown pages
-- ============================================================
DROP POLICY IF EXISTS "Public read wedding for rsvp" ON wedding_profile;
CREATE POLICY "Public read wedding for rsvp"
  ON wedding_profile FOR SELECT
  TO anon
  USING (rsvp_enabled = true OR countdown_enabled = true);

-- ============================================================
-- 6. Public read on guests table for RSVP lookup
-- ============================================================
DROP POLICY IF EXISTS "Public read guests for rsvp" ON guests;
CREATE POLICY "Public read guests for rsvp"
  ON guests FOR SELECT
  TO anon
  USING (
    EXISTS (SELECT 1 FROM wedding_profile WHERE id = wedding_id AND rsvp_enabled = true)
  );

-- Public update on guests for RSVP status
DROP POLICY IF EXISTS "Public update guest rsvp" ON guests;
CREATE POLICY "Public update guest rsvp"
  ON guests FOR UPDATE
  TO anon
  USING (
    EXISTS (SELECT 1 FROM wedding_profile WHERE id = wedding_id AND rsvp_enabled = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM wedding_profile WHERE id = wedding_id AND rsvp_enabled = true)
  );
