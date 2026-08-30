-- F5: inserting a partner invite only proved the sender was not forged; it never
-- checked that the caller owns the wedding the invite points at.

DROP POLICY IF EXISTS "Owner can insert invites" ON public.partner_invites;
CREATE POLICY "Owner can insert invites" ON public.partner_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by_user_id = auth.uid()
    AND wedding_belongs_to_user(wedding_id)
  );
