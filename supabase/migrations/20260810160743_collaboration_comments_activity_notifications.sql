/*
# Collaboration tables: comments, comment_reads, notifications + activity_feed extensions

1. Modified Tables
- `activity_feed` — add entity_type, entity_id, entity_name, summary columns.
2. New Tables
- `comments` — threaded comments on any record (task, budget item, vendor, etc).
- `comment_reads` — tracks last view time per user per entity for unread indicators.
- `notifications` — in-app notifications for @mentions and comments on assigned records.
3. Security
- RLS on all tables, scoped to wedding members (user_id OR partner_user_id).
4. Notes
- All additions are additive. No data loss.
*/

-- ============================================================
-- 1. Extend activity_feed
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_feed' AND column_name = 'entity_type') THEN
    ALTER TABLE activity_feed ADD COLUMN entity_type text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_feed' AND column_name = 'entity_id') THEN
    ALTER TABLE activity_feed ADD COLUMN entity_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_feed' AND column_name = 'entity_name') THEN
    ALTER TABLE activity_feed ADD COLUMN entity_name text DEFAULT '';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_feed' AND column_name = 'summary') THEN
    ALTER TABLE activity_feed ADD COLUMN summary text DEFAULT '';
  END IF;
END $$;

DROP POLICY IF EXISTS "Wedding members can view activity" ON activity_feed;
CREATE POLICY "Wedding members can view activity"
  ON activity_feed FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = activity_feed.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Wedding members can insert activity" ON activity_feed;
CREATE POLICY "Wedding members can insert activity"
  ON activity_feed FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = activity_feed.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Wedding members can update activity" ON activity_feed;
CREATE POLICY "Wedding members can update activity"
  ON activity_feed FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = activity_feed.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())))
  WITH CHECK (true);

DROP POLICY IF EXISTS "Wedding members can delete activity" ON activity_feed;
CREATE POLICY "Wedding members can delete activity"
  ON activity_feed FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = activity_feed.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

CREATE INDEX IF NOT EXISTS idx_activity_feed_wedding_created ON activity_feed(wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON activity_feed(entity_type, entity_id);

-- ============================================================
-- 2. comments table
-- ============================================================

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('task','budget_item','vendor','guest','seating','timeline')),
  entity_id text NOT NULL,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  body text NOT NULL,
  parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  mentions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wedding members can read comments" ON comments;
CREATE POLICY "Wedding members can read comments"
  ON comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = comments.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Wedding members can insert comments" ON comments;
CREATE POLICY "Wedding members can insert comments"
  ON comments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wedding_profile wp WHERE wp.id = comments.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())));

DROP POLICY IF EXISTS "Authors can update own comments" ON comments;
CREATE POLICY "Authors can update own comments"
  ON comments FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "Authors can delete own comments" ON comments;
CREATE POLICY "Authors can delete own comments"
  ON comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR EXISTS (
    SELECT 1 FROM wedding_profile wp WHERE wp.id = comments.wedding_id AND wp.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_comments_wedding ON comments(wedding_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_comment_id);

-- ============================================================
-- 3. comment_reads table (unread tracking)
-- ============================================================

CREATE TABLE IF NOT EXISTS comment_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity_type, entity_id)
);

ALTER TABLE comment_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own comment_reads" ON comment_reads;
CREATE POLICY "Users can read own comment_reads"
  ON comment_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own comment_reads" ON comment_reads;
CREATE POLICY "Users can insert own comment_reads"
  ON comment_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own comment_reads" ON comment_reads;
CREATE POLICY "Users can update own comment_reads"
  ON comment_reads FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own comment_reads" ON comment_reads;
CREATE POLICY "Users can delete own comment_reads"
  ON comment_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_comment_reads_user ON comment_reads(user_id, entity_type, entity_id);

-- ============================================================
-- 4. notifications table
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES wedding_profile(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name text DEFAULT '',
  type text NOT NULL CHECK (type IN ('comment','mention','assignment','activity')),
  entity_type text DEFAULT '',
  entity_id text DEFAULT '',
  entity_name text DEFAULT '',
  body text DEFAULT '',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (recipient_id = auth.uid() OR EXISTS (
    SELECT 1 FROM wedding_profile wp WHERE wp.id = notifications.wedding_id AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(recipient_id, read_at) WHERE read_at IS NULL;
