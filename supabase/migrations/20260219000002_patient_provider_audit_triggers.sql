-- Patient and Provider Audit Triggers
-- Automatically log all changes to patients and providers tables

-- Create trigger function for patient changes
CREATE OR REPLACE FUNCTION log_patient_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_data,
      new_data
    ) VALUES (
      'patients',
      'DELETE',
      OLD.id,
      auth.uid(),
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_data,
      new_data
    ) VALUES (
      'patients',
      'UPDATE',
      NEW.id,
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_data,
      new_data
    ) VALUES (
      'patients',
      'INSERT',
      NEW.id,
      auth.uid(),
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function for provider changes
CREATE OR REPLACE FUNCTION log_provider_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_data,
      new_data
    ) VALUES (
      'providers',
      'DELETE',
      OLD.id,
      auth.uid(),
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_data,
      new_data
    ) VALUES (
      'providers',
      'UPDATE',
      NEW.id,
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs (
      table_name,
      operation,
      record_id,
      user_id,
      old_data,
      new_data
    ) VALUES (
      'providers',
      'INSERT',
      NEW.id,
      auth.uid(),
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS patients_audit_trigger ON patients;
DROP TRIGGER IF EXISTS providers_audit_trigger ON providers;

-- Create trigger on patients table
CREATE TRIGGER patients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION log_patient_changes();

-- Create trigger on providers table
CREATE TRIGGER providers_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION log_provider_changes();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_patient_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION log_patient_changes() TO service_role;
GRANT EXECUTE ON FUNCTION log_provider_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION log_provider_changes() TO service_role;

-- Add comments
COMMENT ON FUNCTION log_patient_changes() IS 'Automatically logs all INSERT, UPDATE, and DELETE operations on patients table to audit_logs';
COMMENT ON FUNCTION log_provider_changes() IS 'Automatically logs all INSERT, UPDATE, and DELETE operations on providers table to audit_logs';
