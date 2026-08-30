/*
# Push notification pipeline: subscriptions, preferences, log

1. New Tables
- `push_subscriptions` — web push subscriptions keyed to user + device endpoint.
  Stores the PushSubscription JSON (endpoint, keys.p256dh, keys.auth) so the
  edge function can send via Web Push protocol.
- `notification_preferences` — one row per user. Per-type push/email on/off
  matrix stored as JSONB, quiet-hours window (start/end as "HH:MM"), and
  pause_all_until (timestamp) to suppress all notifications until a date.
- `notification_log` — record of every notification sent, with type, recipient,
  deep_link, and status. Useful for debugging and dedup.

2. Security
- RLS on push_subscriptions and notification_preferences: users can only CRUD
  their own rows (matched by user_id = auth.uid()).
- notification_log: users can read their own log; inserts are done via service
  role (edge functions), so no INSERT policy for authenticated.

3. Notes
- `device_label` on push_subscriptions is a friendly name the user can recognize
  (e.g. "iPhone", "Chrome on Mac"). Unique constraint on (user_id, endpoint)
  prevents duplicate subscriptions for the same device.
- `notif_types` JSONB keys: task_due, payment_due_7day, payment_due_today,
  rsvp_deadline, new_rsvp, partner_task, mention. Each maps to {push:bool, email:bool}.
*/

-- ============================================================
-- 1. push_subscriptions
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL DEFAULT '',
  auth_key text NOT NULL DEFAULT '',
  device_label text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users read own push_subscriptions"
  ON push_subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users insert own push_subscriptions"
  ON push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users delete own push_subscriptions"
  ON push_subscriptions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);

-- ============================================================
-- 2. notification_preferences
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notif_types jsonb NOT NULL DEFAULT '{
    "task_due": {"push": true, "email": true},
    "payment_due_7day": {"push": true, "email": true},
    "payment_due_today": {"push": true, "email": true},
    "rsvp_deadline": {"push": true, "email": true},
    "new_rsvp": {"push": true, "email": false},
    "partner_task": {"push": true, "email": false},
    "mention": {"push": true, "email": true}
  }'::jsonb,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '07:00',
  pause_all_until timestamptz DEFAULT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification_preferences" ON notification_preferences;
CREATE POLICY "Users read own notification_preferences"
  ON notification_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users upsert own notification_preferences" ON notification_preferences;
CREATE POLICY "Users upsert own notification_preferences"
  ON notification_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own notification_preferences" ON notification_preferences;
CREATE POLICY "Users update own notification_preferences"
  ON notification_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. notification_log
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notif_type text NOT NULL,
  title text NOT NULL,
  body text DEFAULT '',
  deep_link text DEFAULT '',
  status text DEFAULT 'sent',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification_log" ON notification_log;
CREATE POLICY "Users read own notification_log"
  ON notification_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notif_log_user ON notification_log(user_id, created_at DESC);
