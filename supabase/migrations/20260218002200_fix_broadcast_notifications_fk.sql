-- =====================================================
-- Fix Broadcast Notifications FK Constraint
-- Migration: 20260218002200_fix_broadcast_notifications_fk.sql
-- Purpose: Make created_by optional and remove FK requirement
-- =====================================================

-- Drop the old constraint
ALTER TABLE public.broadcast_notifications 
DROP CONSTRAINT IF EXISTS broadcast_notifications_created_by_fkey;

-- Modify created_by to be nullable
ALTER TABLE public.broadcast_notifications 
ALTER COLUMN created_by DROP NOT NULL;

-- Add a CHECK constraint instead to allow NULL or valid admin_users
ALTER TABLE public.broadcast_notifications 
ADD CONSTRAINT broadcast_notifications_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- Update the RPC function to handle NULL created_by better
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
  v_total_recipients INT;
  v_patient_count INT;
  v_provider_count INT;
BEGIN
  -- Get the current authenticated user (admin)
  v_admin_id := auth.uid();
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Create the broadcast notification
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
  RETURNING broadcast_notifications.id INTO v_notification_id;

  -- Add recipients based on recipient_type
  IF p_recipient_type = 'patients' OR p_recipient_type = 'both' THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      patient_id
    )
    SELECT v_notification_id, id FROM public.patients WHERE is_active = TRUE;
    
    GET DIAGNOSTICS v_patient_count = ROW_COUNT;
  END IF;

  IF p_recipient_type = 'providers' OR p_recipient_type = 'both' THEN
    INSERT INTO public.broadcast_notification_recipients (
      broadcast_notification_id,
      provider_id
    )
    SELECT v_notification_id, id FROM public.providers WHERE is_active = TRUE;
    
    GET DIAGNOSTICS v_provider_count = ROW_COUNT;
  END IF;

  -- Calculate total recipients
  SELECT COUNT(*) INTO v_total_recipients
  FROM public.broadcast_notification_recipients
  WHERE broadcast_notification_id = v_notification_id;

  -- Update notification with recipient count
  UPDATE public.broadcast_notifications
  SET total_recipients = v_total_recipients
  WHERE id = v_notification_id;

  -- Return the created notification
  RETURN QUERY
  SELECT
    v_notification_id,
    p_title,
    p_message,
    p_recipient_type,
    CASE WHEN p_scheduled_at IS NULL THEN 'draft'::VARCHAR ELSE 'scheduled'::VARCHAR END,
    p_scheduled_at,
    v_admin_id,
    v_total_recipients;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_broadcast_notification(VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ) TO authenticated;

