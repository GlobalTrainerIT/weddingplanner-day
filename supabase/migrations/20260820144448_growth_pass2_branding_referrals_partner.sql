/*
# Growth Pass 2: Branding toggle, referral rewards, partner invite tracking

## Changes

### 1. Branding toggle (wedding_profile)
- Adds `hide_branding` boolean column to `wedding_profile`, default false.
- Free users see branding on public pages; Pro users can hide it.

### 2. Referral rewards tracking (referrals table)
- Adds `status` text column default 'signed_up'.
- Adds `reward_months_earned` integer column default 0.
- Adds `referred_email` text column.
- Adds `converted_at` timestamp column.

### 3. Referral aggregate helper
- Adds a SECURITY DEFINER function `get_referral_stats(p_user_id uuid)` returning
  total_referrals, converted count, and months_earned for a user.

### 4. Partner invites status
- Adds `status` text column default 'pending'.
- Adds `accepted_at` timestamp column.

## Security
- `get_referral_stats` is SECURITY DEFINER, EXECUTE granted to authenticated only.
- All new columns are nullable or have safe defaults.
*/

-- 1. Branding toggle
ALTER TABLE wedding_profile
  ADD COLUMN IF NOT EXISTS hide_branding boolean NOT NULL DEFAULT false;

-- 2. Referral rewards columns
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'signed_up';
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS reward_months_earned integer NOT NULL DEFAULT 0;
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS referred_email text;
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

-- 3. Partner invite status columns
ALTER TABLE partner_invites
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE partner_invites
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- 4. Referral stats helper function (SECURITY DEFINER)
-- Drop old version if it exists from a prior partial run
DROP FUNCTION IF EXISTS get_referral_stats(uuid);

CREATE FUNCTION get_referral_stats(p_user_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_referrals', count(*),
    'converted', count(*) FILTER (WHERE status = 'converted' OR status = 'rewarded'),
    'months_earned', coalesce(sum(reward_months_earned), 0)
  )
  FROM referrals
  WHERE referrer_user_id = p_user_id;
$$;

-- Restrict execution to authenticated users only
REVOKE ALL ON FUNCTION get_referral_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_referral_stats(uuid) TO authenticated;
