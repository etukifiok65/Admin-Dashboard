-- ================================================================
-- FIX: SUPPORT MESSAGE RESPONSE EMAIL TRIGGER - REMOVE INVALID AUTH
-- ================================================================

CREATE OR REPLACE FUNCTION send_support_message_response_email()
RETURNS TRIGGER AS $$
DECLARE
  v_admin RECORD;
  v_edge_function_url TEXT;
  v_response INT;
BEGIN
  -- Only send email when admin_response is newly added or updated
  IF NEW.admin_response IS NOT NULL AND (OLD.admin_response IS NULL OR NEW.admin_response != OLD.admin_response) THEN
    
    -- Get admin details (who responded)
    IF NEW.responded_by IS NOT NULL THEN
      SELECT name, email
      INTO v_admin
      FROM admin_users
      WHERE id = NEW.responded_by;
    END IF;
    
    -- Set edge function URL
    v_edge_function_url := 'https://spjqtdxnspndnnluayxp.supabase.co/functions/v1/send-support-response-email';
    
    -- Send email to message sender
    IF NEW.email IS NOT NULL THEN
      SELECT status INTO v_response FROM http((
        'POST',
        v_edge_function_url,
        ARRAY[
          http_header('Content-Type', 'application/json')
        ],
        'application/json',
        json_build_object(
          'email', NEW.email,
          'name', NEW.name,
          'subject', COALESCE(NEW.subject, 'Your Message'),
          'originalMessage', NEW.message,
          'adminResponse', NEW.admin_response,
          'adminName', COALESCE(v_admin.name, 'Support Team'),
          'category', NEW.category,
          'status', NEW.status,
          'respondedAt', to_char(NEW.responded_at, 'FMMonth DD, YYYY at HH12:MI AM')
        )::text
      )::http_request);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
