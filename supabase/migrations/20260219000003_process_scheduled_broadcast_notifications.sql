-- Process Scheduled Broadcast Notifications
-- Marks due scheduled notifications as sent and updates delivery counts

CREATE OR REPLACE FUNCTION public.process_scheduled_broadcast_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed_count INTEGER := 0;
BEGIN
  WITH due_notifications AS (
    UPDATE public.broadcast_notifications bn
    SET
      status = 'sent',
      sent_at = COALESCE(bn.sent_at, NOW()),
      delivered_count = COALESCE(bn.total_recipients, 0),
      updated_at = NOW()
    WHERE bn.status = 'scheduled'
      AND bn.scheduled_at IS NOT NULL
      AND bn.scheduled_at <= NOW()
    RETURNING bn.id
  )
  SELECT COUNT(*)::INTEGER INTO v_processed_count FROM due_notifications;

  RETURN v_processed_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_scheduled_broadcast_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_scheduled_broadcast_notifications() TO service_role;

-- Optional: register a pg_cron job (only if cron schema is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'process_scheduled_broadcast_notifications_every_minute';

    PERFORM cron.schedule(
      'process_scheduled_broadcast_notifications_every_minute',
      '* * * * *',
      'SELECT public.process_scheduled_broadcast_notifications();'
    );
  END IF;
END;
$$;
