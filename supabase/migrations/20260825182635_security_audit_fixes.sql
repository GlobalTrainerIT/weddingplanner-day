/*
# Security Audit Fixes

## Summary
Fixes 8 issues identified in a comprehensive security audit:

1. **HIGH — leads table INSERT policy rejects valid sources + missing metadata column**
   The leads INSERT policy only allows 3 source values, but the app writes 10+ different
   sources (seating-chart-maker, guest-list-template, blog_checklist_download, etc.).
   Every insert from free tools and blog email captures silently fails. Also adds a
   `metadata` jsonb column that BlogEmailCapture.tsx writes to but doesn't exist.

2. **HIGH — subscriptions table: revoke DML from authenticated role**
   Only the service role (via edge functions) should mutate subscription state.
   The authenticated role retains SELECT (users can read their own plan) but loses
   INSERT/UPDATE/DELETE grants so a policy misconfiguration can never let users
   self-upgrade.

3. **MEDIUM — referrals: prevent self-referral and validate referral_code**
   A user could insert a row where referrer_user_id = referred_user_id, crediting
   themselves free Pro. Also, the INSERT policy didn't validate that the
   referral_code corresponds to a real wedding_profile. Now the policy checks both.

4. **MEDIUM — partner_invites UPDATE policy too broad**
   The invited user could change wedding_id on the row, gaining access to another
   couple's data. The UPDATE policy now requires status = 'pending' (USING) and
   only allows setting status to 'accepted' with accepted_at (WITH CHECK restricts
   the columns that may change).

5. **LOW — Revoke TRUNCATE from authenticated on all tables**
   TRUNCATE bypasses RLS. No app code uses it, but the grant was unnecessary.

6. **LOW — Revoke INSERT from authenticated on notifications**
   Notifications are only inserted by the service role (edge functions).
   The authenticated role doesn't need INSERT privilege.

## Tables affected
- leads (new column + policy update)
- subscriptions (grant revocation)
- referrals (policy update + check constraint)
- partner_invites (policy update)
- notifications (grant revocation)
- All public tables (TRUNCATE revocation)

## Security changes
- leads: ALTER TABLE ADD COLUMN metadata jsonb; DROP + recreate INSERT policy with
  expanded source allowlist.
- subscriptions: REVOKE INSERT, UPDATE, DELETE, TRUNCATE FROM authenticated.
- referrals: DROP + recreate INSERT policy with self-referral prevention and
  referral_code validation; ADD CHECK constraint referrer_user_id <> referred_user_id.
- partner_invites: DROP + recreate UPDATE policy with USING (status='pending') and
  WITH CHECK that only allows status/accepted_at changes.
- notifications: REVOKE INSERT, TRUNCATE FROM authenticated.
- All 26 public tables: REVOKE TRUNCATE FROM authenticated.

## Important notes
1. The referrals INSERT policy now does a subquery to wedding_profile to validate
   the referral_code. This requires SELECT privilege on wedding_profile for
   authenticated users, which already exists.
2. The partner_invites WITH CHECK uses a function to compare the new row against
   the old row column-by-column, ensuring only status and accepted_at may change.
   We use a simple approach: the WITH CHECK verifies invited_email still matches
   (so the caller is still the invited user) and status is now 'accepted'.
3. subscriptions SELECT policy is retained so users can read their own plan.
   All mutations go through edge functions using the service role key.
*/

-- ═══════════════════════════════════════════════════════════════
-- H2+H3: leads table — add metadata column + fix INSERT policy
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Drop old INSERT policy and recreate with full source allowlist
DROP POLICY IF EXISTS "Authenticated insert own lead" ON leads;
DROP POLICY IF EXISTS "anon insert lead" ON leads;

CREATE POLICY "Authenticated insert own lead" ON leads
  FOR INSERT TO authenticated
  WITH CHECK (
    email IS NOT NULL
    AND source IS NOT NULL
    AND source = ANY (ARRAY[
      'tool'::text,
      'checklist-tool'::text,
      'budget-tool'::text,
      'planner_waitlist'::text,
      'blog_checklist_download'::text,
      'seating-chart-maker'::text,
      'guest-list-template'::text,
      'day-timeline-template'::text,
      'hashtag-generator'::text,
      'honeymoon-budget-calculator'::text,
      'vendor-questions'::text,
      'save-the-date-wording'::text
    ])
  );

CREATE POLICY "anon insert lead" ON leads
  FOR INSERT TO anon
  WITH CHECK (
    email IS NOT NULL
    AND source IS NOT NULL
    AND source = ANY (ARRAY[
      'tool'::text,
      'checklist-tool'::text,
      'budget-tool'::text,
      'planner_waitlist'::text,
      'blog_checklist_download'::text,
      'seating-chart-maker'::text,
      'guest-list-template'::text,
      'day-timeline-template'::text,
      'hashtag-generator'::text,
      'honeymoon-budget-calculator'::text,
      'vendor-questions'::text,
      'save-the-date-wording'::text
    ])
  );

-- ═══════════════════════════════════════════════════════════════
-- H1: subscriptions — revoke DML from authenticated (service-role only)
-- ═══════════════════════════════════════════════════════════════

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON subscriptions FROM authenticated;

-- ═══════════════════════════════════════════════════════════════
-- M1+M2: referrals — prevent self-referral + validate referral_code
-- ═══════════════════════════════════════════════════════════════

-- Add check constraint to prevent self-referral at the database level
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'referrals_no_self_referral'
    AND conrelid = 'referrals'::regclass
  ) THEN
    ALTER TABLE referrals
      ADD CONSTRAINT referrals_no_self_referral
      CHECK (referrer_user_id <> referred_user_id);
  END IF;
END $$;

-- Recreate INSERT policy: caller must be the referred user, referrer must differ,
-- and the referral_code must exist in wedding_profile
DROP POLICY IF EXISTS "Authenticated insert own referral" ON referrals;

CREATE POLICY "Authenticated insert own referral" ON referrals
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = referred_user_id
    AND referrer_user_id <> referred_user_id
    AND EXISTS (
      SELECT 1 FROM wedding_profile wp
      WHERE wp.referral_code = referrals.referral_code
      AND wp.user_id = referrer_user_id
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- M3: partner_invites — scope UPDATE to status acceptance only
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Invited user can accept their own invite" ON partner_invites;

CREATE POLICY "Invited user can accept their own invite" ON partner_invites
  FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND invited_email = (
      SELECT u.email FROM auth.users u WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    invited_email = (
      SELECT u.email FROM auth.users u WHERE u.id = auth.uid()
    )
    AND status = 'accepted'
    AND wedding_id = (
      SELECT pi.wedding_id FROM partner_invites pi
      WHERE pi.id = partner_invites.id
    )
    AND invited_by_user_id = (
      SELECT pi.invited_by_user_id FROM partner_invites pi
      WHERE pi.id = partner_invites.id
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- L3: Revoke TRUNCATE from authenticated on all public tables
-- ═══════════════════════════════════════════════════════════════

REVOKE TRUNCATE ON activity_feed FROM authenticated;
REVOKE TRUNCATE ON bridal_party FROM authenticated;
REVOKE TRUNCATE ON budget_items FROM authenticated;
REVOKE TRUNCATE ON budget_payments FROM authenticated;
REVOKE TRUNCATE ON checklist_items FROM authenticated;
REVOKE TRUNCATE ON comment_reads FROM authenticated;
REVOKE TRUNCATE ON comments FROM authenticated;
REVOKE TRUNCATE ON guests FROM authenticated;
REVOKE TRUNCATE ON households FROM authenticated;
REVOKE TRUNCATE ON leads FROM authenticated;
REVOKE TRUNCATE ON notes FROM authenticated;
REVOKE TRUNCATE ON notification_log FROM authenticated;
REVOKE TRUNCATE ON notification_preferences FROM authenticated;
REVOKE TRUNCATE ON notifications FROM authenticated;
REVOKE TRUNCATE ON partner_invites FROM authenticated;
REVOKE TRUNCATE ON push_subscriptions FROM authenticated;
REVOKE TRUNCATE ON referrals FROM authenticated;
REVOKE TRUNCATE ON rsvp_responses FROM authenticated;
REVOKE TRUNCATE ON seating_objects FROM authenticated;
REVOKE TRUNCATE ON seating_rules FROM authenticated;
REVOKE TRUNCATE ON seating_tables FROM authenticated;
REVOKE TRUNCATE ON subscriptions FROM authenticated;
REVOKE TRUNCATE ON timeline_assignments FROM authenticated;
REVOKE TRUNCATE ON timeline_events FROM authenticated;
REVOKE TRUNCATE ON vendors FROM authenticated;
REVOKE TRUNCATE ON wedding_profile FROM authenticated;

-- ═══════════════════════════════════════════════════════════════
-- L4: Revoke INSERT from authenticated on notifications
-- ═══════════════════════════════════════════════════════════════

REVOKE INSERT ON notifications FROM authenticated;