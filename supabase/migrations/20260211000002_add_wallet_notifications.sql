-- Create trigger to send notification when withdrawal status changes
DROP FUNCTION IF EXISTS notify_withdrawal_status_change() CASCADE;
CREATE OR REPLACE FUNCTION notify_withdrawal_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification when withdrawal status changes to 'Paid'
  IF NEW.status = 'Paid' AND OLD.status = 'Pending' THEN
    INSERT INTO notifications (provider_id, type, title, message, data)
    VALUES (
      NEW.provider_id,
      'withdrawal',
      'Withdrawal Approved',
      'Your withdrawal request of ₦' || NEW.amount || ' has been approved and is being processed.',
      jsonb_build_object(
        'withdrawalId', NEW.id::text,
        'amount', NEW.amount,
        'status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS provider_withdrawals_notify_status_change ON public.provider_withdrawals;
-- Create trigger on provider_withdrawals table
CREATE TRIGGER provider_withdrawals_notify_status_change
  AFTER UPDATE ON public.provider_withdrawals
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_withdrawal_status_change();
-- Create trigger to notify provider when appointment is completed (earnings credited)
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
      'You have completed an appointment. Earnings of ₦' || COALESCE(NEW.total_cost, 0) || ' (net after fees) have been credited to your wallet.',
      jsonb_build_object(
        'appointmentId', NEW.id::text,
        'amount', COALESCE(NEW.total_cost, 0)
      )
    WHERE COALESCE(NEW.total_cost, 0) > 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS appointments_notify_completed ON public.appointments;
-- Create trigger on appointments table
CREATE TRIGGER appointments_notify_completed
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_appointment_completed();
-- Ensure notifications table has provider_id column (if not already present)
-- This is a safety check - the column should already exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES providers(id) ON DELETE CASCADE;
-- Add RLS policy for notifications if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications'
    AND policyname = 'Providers can view their own notifications'
  ) THEN
    CREATE POLICY "Providers can view their own notifications"
      ON notifications FOR SELECT
      USING (
        provider_id IN (
          SELECT id FROM providers WHERE auth_id = auth.uid()
        )
      );
  END IF;
END $$;
