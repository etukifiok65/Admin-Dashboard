-- Admin Users Audit Triggers
-- Automatically log all changes to admin_users table

-- Create trigger function for audit logging
CREATE OR REPLACE FUNCTION log_admin_user_changes()
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
      'admin_users',
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
      'admin_users',
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
      'admin_users',
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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS admin_users_audit_trigger ON admin_users;

-- Create trigger on admin_users table
CREATE TRIGGER admin_users_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION log_admin_user_changes();

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION log_admin_user_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION log_admin_user_changes() TO service_role;

-- Add comment
COMMENT ON FUNCTION log_admin_user_changes() IS 'Automatically logs all INSERT, UPDATE, and DELETE operations on admin_users table to audit_logs';
