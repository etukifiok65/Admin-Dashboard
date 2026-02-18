-- ================================================================
-- FIX: APPOINTMENT COMPLETION EMAIL TRIGGER COLUMN MISMATCH
-- ================================================================
-- The completion email trigger referenced non-existent columns
-- (email, first_name, last_name) on patients/providers. This updates
-- the trigger to use auth.users.email and the name field instead.

CREATE OR REPLACE FUNCTION send_appointment_completion_email()
RETURNS TRIGGER AS $$
DECLARE
  v_appointment RECORD;
  v_provider RECORD;
  v_patient RECORD;
  v_provider_email TEXT;
  v_patient_email TEXT;
  v_edge_function_url TEXT;
  v_response INT;
  v_gross_amount NUMERIC;
  v_platform_fee NUMERIC;
  v_net_amount NUMERIC;
BEGIN
  -- Only proceed if status changed to 'Completed'
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    -- Get appointment details
    SELECT * INTO v_appointment FROM appointments WHERE id = NEW.id;

    -- Get provider details (email from auth.users)
    SELECT p.id, p.name, p.auth_id
    INTO v_provider
    FROM providers p
    WHERE p.id = v_appointment.provider_id;

    SELECT u.email
    INTO v_provider_email
    FROM auth.users u
    WHERE u.id = v_provider.auth_id;

    -- Get patient details (email from auth.users)
    SELECT p.id, p.name, p.auth_id
    INTO v_patient
    FROM patients p
    WHERE p.id = v_appointment.patient_id;

    SELECT u.email
    INTO v_patient_email
    FROM auth.users u
    WHERE u.id = v_patient.auth_id;

    -- Set edge function URL
    v_edge_function_url := 'https://spjqtdxnspndnnluayxp.supabase.co/functions/v1/send-email';

    -- Calculate earnings (fallback to appointment total_cost)
    v_gross_amount := COALESCE(v_appointment.total_cost, 0);
    v_platform_fee := ROUND(v_gross_amount * 0.2, 2);
    v_net_amount := v_gross_amount - v_platform_fee;

    -- Send email to provider with earnings details
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
          'emailType', 'appointment-completed-earnings',
          'data', json_build_object(
            'patientName', COALESCE(v_patient.name, 'Patient'),
            'serviceType', v_appointment.service_type,
            'date', to_char(v_appointment.scheduled_date, 'FMMonth DD, YYYY'),
            'grossAmount', v_gross_amount,
            'platformFee', v_platform_fee,
            'netAmount', v_net_amount
          )
        )::text
      )::http_request);
    END IF;

    -- Send email to patient (simple completion notification)
    IF v_patient_email IS NOT NULL THEN
      SELECT status INTO v_response FROM http((
        'POST',
        v_edge_function_url,
        ARRAY[
          http_header('Content-Type', 'application/json'),
          http_header('Authorization', 'Bearer REPLACE_WITH_SUPABASE_ANON_KEY')
        ],
        'application/json',
        json_build_object(
          'email', v_patient_email,
          'name', COALESCE(v_patient.name, 'Patient'),
          'emailType', 'appointment-completed',
          'data', json_build_object(
            'providerName', COALESCE(v_provider.name, 'Provider'),
            'serviceType', v_appointment.service_type,
            'date', to_char(v_appointment.scheduled_date, 'FMMonth DD, YYYY')
          )
        )::text
      )::http_request);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Recreate trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trigger_send_appointment_completion_email ON appointments;
CREATE TRIGGER trigger_send_appointment_completion_email
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION send_appointment_completion_email();
