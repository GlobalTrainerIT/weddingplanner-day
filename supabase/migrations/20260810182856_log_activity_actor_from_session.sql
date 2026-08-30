CREATE OR REPLACE FUNCTION public.log_activity(
  p_wedding_id uuid,
  p_user_id uuid,
  p_actor_name text,
  p_action text,
  p_entity_type text DEFAULT ''::text,
  p_entity_id text DEFAULT NULL::text,
  p_entity_name text DEFAULT ''::text,
  p_summary text DEFAULT ''::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_id uuid;
  is_member boolean;
  actor uuid;
BEGIN
  -- The actor is always the caller's session; the p_user_id argument is ignored.
  actor := auth.uid();
  IF actor IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM wedding_profile wp
    WHERE wp.id = p_wedding_id
    AND (wp.user_id = actor OR wp.partner_user_id = actor)
  ) INTO is_member;

  IF NOT is_member THEN
    RETURN NULL;
  END IF;

  SELECT id INTO existing_id
  FROM activity_feed
  WHERE wedding_id = p_wedding_id
    AND user_id = actor
    AND action = p_action
    AND entity_type = p_entity_type
    AND COALESCE(entity_id, '') = COALESCE(p_entity_id, '')
    AND created_at > now() - interval '60 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    UPDATE activity_feed
    SET summary = p_summary, entity_name = p_entity_name, created_at = now()
    WHERE id = existing_id;
    RETURN existing_id;
  END IF;

  INSERT INTO activity_feed (wedding_id, user_id, actor_name, action, entity_type, entity_id, entity_name, summary)
  VALUES (p_wedding_id, actor, p_actor_name, p_action, p_entity_type, p_entity_id, p_entity_name, p_summary)
  RETURNING id INTO existing_id;

  RETURN existing_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.log_activity(uuid, uuid, text, text, text, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.log_activity(uuid, uuid, text, text, text, text, text, text) TO authenticated;