-- =====================================================
-- Add RPC to send a draft broadcast immediately
-- Migration: 20260218002800_add_send_broadcast_now_function.sql
-- Purpose: Allow editable drafts to be sent anytime with recipient generation
-- =====================================================

CREATE OR REPLACE FUNCTION public.send_broadcast_notification_now(
  p_notification_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_recipient_type VARCHAR;
  v_current_status VARCHAR;
  v_existing_creator UUID;
  v_total_recipients INT := 0;
BEGIN
  v_actor_id := auth.uid();

  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT
    bn.recipient_type,
    bn.status,
    bn.created_by
  INTO
    v_recipient_type,
    v_current_status,
    v_existing_creator
  FROM public.broadcast_notifications bn
  WHERE bn.id = p_notification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;

  IF v_existing_creator IS NOT NULL AND v_existing_creator <> v_actor_id THEN
    RAISE EXCEPTION 'You can only send your own draft notifications';
  END IF;

  IF v_current_status = 'sent' THEN
    RETURN p_notification_id;
  END IF;

  DELETE FROM public.broadcast_notification_recipients bnr
  WHERE bnr.broadcast_notification_id = p_notification_id;

  IF v_recipient_type IN ('patients', 'both') THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      patient_id
    )
    SELECT p_notification_id, p.id
    FROM public.patients p
    WHERE p.is_active = TRUE;
  END IF;

  IF v_recipient_type IN ('providers', 'both') THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      provider_id
    )
    SELECT p_notification_id, pr.id
    FROM public.providers pr
    WHERE pr.is_active = TRUE;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_total_recipients
  FROM public.broadcast_notification_recipients bnr
  WHERE bnr.broadcast_notification_id = p_notification_id;

  UPDATE public.broadcast_notifications bn
  SET
    status = 'sent',
    scheduled_at = NULL,
    sent_at = NOW(),
    total_recipients = v_total_recipients,
    delivered_count = v_total_recipients,
    updated_at = NOW()
  WHERE bn.id = p_notification_id;

  RETURN p_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_broadcast_notification_now(UUID) TO authenticated;
