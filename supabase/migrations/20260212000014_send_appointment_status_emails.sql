-- ================================================================
-- SEND APPOINTMENT ACCEPTED / DECLINED EMAILS (TO PATIENT)
-- ================================================================
-- Sends emails when appointment status changes to Scheduled (accepted)
-- or Cancelled (declined). Uses auth.users for email lookups.

CREATE EXTENSION IF NOT EXISTS http;
CREATE OR REPLACE FUNCTION send_appointment_status_email()
RETURNS TRIGGER AS $$
DECLARE
  v_provider RECORD;
  v_patient RECORD;
  v_patient_email TEXT;
  v_edge_function_url TEXT;
  v_response INT;
BEGIN
  -- Only proceed on status changes
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Load provider details
    SELECT p.id, p.name, p.auth_id
    INTO v_provider
    FROM providers p
    WHERE p.id = NEW.provider_id;

    -- Load patient details
    SELECT p.id, p.name, p.auth_id
    INTO v_patient
    FROM patients p
    WHERE p.id = NEW.patient_id;

    SELECT u.email
    INTO v_patient_email
    FROM auth.users u
    WHERE u.id = v_patient.auth_id;

    v_edge_function_url := 'https://spjqtdxnspndnnluayxp.supabase.co/functions/v1/send-email';

    -- Appointment accepted (Scheduled)
    IF NEW.status = 'Scheduled' AND v_patient_email IS NOT NULL THEN
      SELECT status INTO v_response FROM http((
        'POST',
        v_edge_function_url,
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc')
        ],
        'application/json',
        json_build_object(
          'email', v_patient_email,
          'name', COALESCE(v_patient.name, 'Patient'),
          'emailType', 'appointment-accepted',
          'data', json_build_object(
            'providerName', COALESCE(v_provider.name, 'Provider'),
            'serviceType', NEW.service_type,
            'scheduledDate', to_char(NEW.scheduled_date, 'FMMonth DD, YYYY'),
            'scheduledTime', to_char(NEW.scheduled_time, 'HH:MI AM')
          )
        )::text
      )::http_request);
    END IF;

    -- Appointment declined (Cancelled)
    IF NEW.status = 'Cancelled' AND v_patient_email IS NOT NULL THEN
      SELECT status INTO v_response FROM http((
        'POST',
        v_edge_function_url,
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc')
        ],
        'application/json',
        json_build_object(
          'email', v_patient_email,
          'name', COALESCE(v_patient.name, 'Patient'),
          'emailType', 'appointment-declined',
          'data', json_build_object(
            'providerName', COALESCE(v_provider.name, 'Provider'),
            'serviceType', NEW.service_type,
            'scheduledDate', to_char(NEW.scheduled_date, 'FMMonth DD, YYYY')
          )
        )::text
      )::http_request);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_send_appointment_status_email ON appointments;
CREATE TRIGGER trigger_send_appointment_status_email
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_appointment_status_email();
