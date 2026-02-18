-- =====================================================
-- Update Appointment Completion Notification Message
-- Migration: 20260211000010
-- Purpose: Simplify notification message to not include specific amount
-- =====================================================

-- Update the notification function to remove earnings amount from message
CREATE OR REPLACE FUNCTION notify_appointment_completed()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification when appointment is completed
  IF NEW.status = 'Completed' AND OLD.status IS DISTINCT FROM 'Completed' THEN
    INSERT INTO notifications (provider_id, type, title, message, data)
    SELECT
      NEW.provider_id,
      'earning',
      'Appointment Completed',
      'You have completed an appointment. Earnings have been credited to your wallet.',
      jsonb_build_object(
        'appointmentId', NEW.id::text,
        'amount', COALESCE(NEW.total_cost, 0)
      )
    WHERE COALESCE(NEW.total_cost, 0) > 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
