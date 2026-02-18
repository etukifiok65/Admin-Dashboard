-- =====================================================
-- Create robust V2 broadcast notification RPC
-- Migration: 20260218002600_create_broadcast_notification_v2.sql
-- Purpose: Avoid return-shape ambiguity by returning only created notification id
-- =====================================================

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
    created_by
  )
  VALUES (
    p_title,
    p_message,
    p_recipient_type,
    CASE WHEN p_scheduled_at IS NULL THEN 'draft' ELSE 'scheduled' END,
    p_scheduled_at,
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
  SET total_recipients = v_total_recipients
  WHERE bn.id = v_notification_id;

  RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_broadcast_notification_v2(VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ) TO authenticated;
