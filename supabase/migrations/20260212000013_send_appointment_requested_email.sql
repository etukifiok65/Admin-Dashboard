-- ================================================================
-- SEND APPOINTMENT REQUESTED EMAIL (TO PROVIDER)
-- ================================================================
-- Sends an email to the provider when a patient books an appointment.
-- Uses auth.users for email since providers table does not store email.

CREATE EXTENSION IF NOT EXISTS http;
CREATE OR REPLACE FUNCTION send_appointment_requested_email()
RETURNS TRIGGER AS $$
DECLARE
  v_provider RECORD;
  v_patient RECORD;
  v_provider_email TEXT;
  v_edge_function_url TEXT;
  v_response INT;
BEGIN
  -- Only send for new appointment requests
  IF TG_OP = 'INSERT' AND NEW.status = 'Requested' THEN
    -- Provider details
    SELECT p.id, p.name, p.auth_id
    INTO v_provider
    FROM providers p
    WHERE p.id = NEW.provider_id;

    SELECT u.email
    INTO v_provider_email
    FROM auth.users u
    WHERE u.id = v_provider.auth_id;

    -- Patient details
    SELECT p.id, p.name
    INTO v_patient
    FROM patients p
    WHERE p.id = NEW.patient_id;

    v_edge_function_url := 'https://spjqtdxnspndnnluayxp.supabase.co/functions/v1/send-email';

    IF v_provider_email IS NOT NULL THEN
      SELECT status INTO v_response FROM http((
        'POST',
        v_edge_function_url,
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer REPLACE_WITH_SUPABASE_ANON_KEY')
        ],
        'application/json',
        json_build_object(
          'email', v_provider_email,
          'name', COALESCE(v_provider.name, 'Provider'),
          'emailType', 'appointment-requested',
          'data', json_build_object(
            'patientName', COALESCE(v_patient.name, 'A patient'),
            'serviceType', NEW.service_type,
            'scheduledDate', to_char(NEW.scheduled_date, 'FMMonth DD, YYYY'),
            'scheduledTime', to_char(NEW.scheduled_time, 'HH:MI AM'),
            'urgencyLevel', NEW.urgency_level
          )
        )::text
      )::http_request);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_send_appointment_requested_email ON appointments;
CREATE TRIGGER trigger_send_appointment_requested_email
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_appointment_requested_email();
