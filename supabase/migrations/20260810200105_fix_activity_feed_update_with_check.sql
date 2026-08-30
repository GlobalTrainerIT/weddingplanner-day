-- F4: the activity feed UPDATE policy had WITH CHECK true, so a member could
-- rewrite wedding_id and move the row into another couple's feed.

DROP POLICY IF EXISTS "Wedding members can update activity" ON public.activity_feed;
CREATE POLICY "Wedding members can update activity" ON public.activity_feed
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_profile wp
      WHERE wp.id = activity_feed.wedding_id
        AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_profile wp
      WHERE wp.id = activity_feed.wedding_id
        AND (wp.user_id = auth.uid() OR wp.partner_user_id = auth.uid())
    )
  );
