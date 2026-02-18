-- ================================================================
-- FIX: REMOVE DUPLICATE WITHDRAWAL EMAIL TRIGGERS
-- ================================================================
-- This migration removes any duplicate withdrawal email triggers
-- that may have been created by previous migrations and establishes
-- a single, definitive trigger.

-- Drop any existing withdrawal email-related triggers
DROP TRIGGER IF EXISTS trigger_send_withdrawal_status_email ON public.provider_withdrawals;
DROP TRIGGER IF EXISTS send_withdrawal_status_email_trigger ON public.provider_withdrawals;
DROP TRIGGER IF EXISTS withdrawal_send_email_trigger ON public.provider_withdrawals;
DROP TRIGGER IF EXISTS provider_withdrawals_send_email ON public.provider_withdrawals;
-- Drop any existing functions related to withdrawal emails
DROP FUNCTION IF EXISTS send_withdrawal_status_email();
-- Create fresh, single withdrawal email function
CREATE FUNCTION send_withdrawal_status_email()
RETURNS TRIGGER AS $$
DECLARE
  v_provider RECORD;
  v_payout_method RECORD;
  v_provider_email TEXT;
  v_edge_function_url TEXT;
  v_response INT;
  v_email_type TEXT;
  v_bank_account TEXT;
BEGIN
  -- Get provider details
  SELECT p.id, p.name, p.auth_id
  INTO v_provider
  FROM providers p
  WHERE p.id = NEW.provider_id;

  -- Get provider email from auth.users
  SELECT u.email
  INTO v_provider_email
  FROM auth.users u
  WHERE u.id = v_provider.auth_id;
  
  -- Set edge function URL
  v_edge_function_url := 'https://spjqtdxnspndnnluayxp.supabase.co/functions/v1/send-email';
  
  -- Handle pending status (new withdrawal request) - ONLY on initial insertion
  IF NEW.status = 'Pending' AND OLD.status IS NULL THEN
    v_email_type := 'withdrawal-requested';
    
    IF v_provider_email IS NOT NULL THEN
      -- Make single HTTP request to edge function
      SELECT status INTO v_response FROM http((
        'POST',
        v_edge_function_url,
        ARRAY[http_header('Content-Type', 'application/json'), http_header('Authorization', 'Bearer REPLACE_WITH_SUPABASE_ANON_KEY')],
        'application/json',
        json_build_object(
          'email', v_provider_email,
          'name', v_provider.name,
          'emailType', v_email_type,
          'data', json_build_object(
            'amount', NEW.amount,
            'requestDate', to_char(NEW.requested_at, 'FMMonth DD, YYYY')
          )
        )::text
      )::http_request);
    END IF;
  END IF;
  
  -- Handle paid status (withdrawal completed) - ONLY when transitioning from Pending to Paid
  IF NEW.status = 'Paid' AND OLD.status = 'Pending' THEN
    v_email_type := 'withdrawal-paid';
    
    -- Get payout method details
    SELECT bank_name, account_number 
    INTO v_payout_method 
    FROM provider_payout_methods 
    WHERE id = NEW.payout_method_id;
    
    -- Format bank account for display (mask some digits)
    IF v_payout_method.account_number IS NOT NULL THEN
      v_bank_account := v_payout_method.bank_name || ' ****' || RIGHT(v_payout_method.account_number, 4);
    ELSE
      v_bank_account := v_payout_method.bank_name;
    END IF;
    
    IF v_provider_email IS NOT NULL THEN
      -- Make single HTTP request to edge function
      SELECT status INTO v_response FROM http((
        'POST',
        v_edge_function_url,
        ARRAY[http_header('Content-Type', 'application/json'), http_header('Authorization', 'Bearer REPLACE_WITH_SUPABASE_ANON_KEY')],
        'application/json',
        json_build_object(
          'email', v_provider_email,
          'name', v_provider.name,
          'emailType', v_email_type,
          'data', json_build_object(
            'amount', NEW.amount,
            'paidDate', to_char(NEW.processed_at, 'FMMonth DD, YYYY'),
            'bankAccount', v_bank_account
          )
        )::text
      )::http_request);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Create SINGLE definitive trigger for withdrawal emails
CREATE TRIGGER send_withdrawal_status_email_trigger
  AFTER INSERT OR UPDATE ON public.provider_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION send_withdrawal_status_email();
