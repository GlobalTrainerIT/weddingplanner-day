-- ============================================================
-- Fix 1: leads — replace unrestricted WITH CHECK (true)
-- Restrict inserts to rows with a non-empty email and a
-- recognised source value. This keeps public tool capture
-- working while preventing arbitrary junk inserts.
-- ============================================================
DROP POLICY IF EXISTS "Public insert leads" ON leads;

CREATE POLICY "Public insert leads"
  ON leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND char_length(trim(email)) > 0
    AND char_length(email) <= 500
    AND source IN ('checklist-tool', 'budget-tool', 'tool')
  );

-- ============================================================
-- Fix 2: referrals — replace unrestricted WITH CHECK (true)
-- Remove anon access. Authenticated users may only insert a
-- row where referred_user_id equals their own uid, preventing
-- forgery of referral records for other users.
-- ============================================================
DROP POLICY IF EXISTS "Service insert referrals" ON referrals;

CREATE POLICY "Authenticated insert own referral"
  ON referrals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = referred_user_id);
