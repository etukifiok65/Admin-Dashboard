-- =====================================================
-- Set immediate broadcasts to sent
-- Migration: 20260218002700_set_immediate_broadcasts_to_sent.sql
-- Purpose: Unscheduled notifications should be created as sent, not draft
-- =====================================================

-- Backfill existing immediate drafts created without scheduling
UPDATE public.broadcast_notifications
SET
  status = 'sent',
  sent_at = COALESCE(sent_at, created_at, NOW()),
  delivered_count = CASE WHEN delivered_count = 0 THEN total_recipients ELSE delivered_count END,
  updated_at = NOW()
WHERE status = 'draft'
  AND scheduled_at IS NULL;

-- Keep legacy RPC behavior consistent
CREATE OR REPLACE FUNCTION public.create_broadcast_notification(
  p_title VARCHAR,
  p_message TEXT,
  p_recipient_type VARCHAR,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  message TEXT,
  recipient_type VARCHAR,
  status VARCHAR,
  scheduled_at TIMESTAMPTZ,
  created_by UUID,
  total_recipients INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_admin_id UUID;
  v_total_recipients INT := 0;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.broadcast_notifications (
    title,
    message,
    recipient_type,
    status,
    scheduled_at,
    sent_at,
    created_by
  )
  VALUES (
    p_title,
    p_message,
    p_recipient_type,
    CASE WHEN p_scheduled_at IS NULL THEN 'sent' ELSE 'scheduled' END,
    p_scheduled_at,
    CASE WHEN p_scheduled_at IS NULL THEN NOW() ELSE NULL END,
    v_admin_id
  )
  RETURNING broadcast_notifications.id INTO v_notification_id;

  IF p_recipient_type IN ('patients', 'both') THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      patient_id
    )
    SELECT v_notification_id, p.id
    FROM public.patients p
    WHERE p.is_active = TRUE;
  END IF;

  IF p_recipient_type IN ('providers', 'both') THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      provider_id
    )
    SELECT v_notification_id, pr.id
    FROM public.providers pr
    WHERE pr.is_active = TRUE;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_total_recipients
  FROM public.broadcast_notification_recipients bnr
  WHERE bnr.broadcast_notification_id = v_notification_id;

  UPDATE public.broadcast_notifications bn
  SET
    total_recipients = v_total_recipients,
    delivered_count = CASE WHEN p_scheduled_at IS NULL THEN v_total_recipients ELSE delivered_count END
  WHERE bn.id = v_notification_id;

  RETURN QUERY
  SELECT
    bn.id,
    bn.title,
    bn.message,
    bn.recipient_type,
    bn.status,
    bn.scheduled_at,
    bn.created_by,
    bn.total_recipients
  FROM public.broadcast_notifications bn
  WHERE bn.id = v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_broadcast_notification(VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ) TO authenticated;

-- Update v2 RPC used by frontend
CREATE OR REPLACE FUNCTION public.create_broadcast_notification_v2(
  p_title VARCHAR,
  p_message TEXT,
  p_recipient_type VARCHAR,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_admin_id UUID;
  v_total_recipients INT := 0;
BEGIN
  v_admin_id := auth.uid();

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.broadcast_notifications (
    title,
    message,
    recipient_type,
    status,
    scheduled_at,
    sent_at,
    created_by
  )
  VALUES (
    p_title,
    p_message,
    p_recipient_type,
    CASE WHEN p_scheduled_at IS NULL THEN 'sent' ELSE 'scheduled' END,
    p_scheduled_at,
    CASE WHEN p_scheduled_at IS NULL THEN NOW() ELSE NULL END,
    v_admin_id
  )
  RETURNING id INTO v_notification_id;

  IF p_recipient_type IN ('patients', 'both') THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      patient_id
    )
    SELECT v_notification_id, p.id
    FROM public.patients p
    WHERE p.is_active = TRUE;
  END IF;

  IF p_recipient_type IN ('providers', 'both') THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      provider_id
    )
    SELECT v_notification_id, pr.id
    FROM public.providers pr
    WHERE pr.is_active = TRUE;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_total_recipients
  FROM public.broadcast_notification_recipients bnr
  WHERE bnr.broadcast_notification_id = v_notification_id;

  UPDATE public.broadcast_notifications bn
  SET
    total_recipients = v_total_recipients,
    delivered_count = CASE WHEN p_scheduled_at IS NULL THEN v_total_recipients ELSE delivered_count END
  WHERE bn.id = v_notification_id;

  RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_broadcast_notification_v2(VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ) TO authenticated;
