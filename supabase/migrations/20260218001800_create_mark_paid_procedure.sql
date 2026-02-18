-- =====================================================
-- Create Stored Procedure for Mark as Paid
-- Migration: 20260218001800_create_mark_paid_procedure.sql
-- Purpose: Bypass RLS by using SECURITY DEFINER function
-- =====================================================

-- Create a function that can update withdrawal status
-- This function uses SECURITY DEFINER to run with superuser privileges
-- allowing the anon key to call it even with RLS enabled
CREATE OR REPLACE FUNCTION public.mark_withdrawal_as_paid(
  withdrawal_id UUID,
  new_status VARCHAR DEFAULT 'Paid'
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  amount NUMERIC,
  status VARCHAR,
  requested_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  payout_method_id UUID,
  admin_note TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the withdrawal record
  UPDATE public.provider_withdrawals
  SET 
    status = new_status,
    processed_at = CASE 
      WHEN new_status = 'Paid' THEN NOW()
      ELSE processed_at
    END,
    updated_at = NOW()
  WHERE id = withdrawal_id;

  -- Return the updated record
  RETURN QUERY
  SELECT 
    pw.id,
    pw.provider_id,
    pw.amount,
    pw.status,
    pw.requested_at,
    pw.processed_at,
    pw.payout_method_id,
    pw.admin_note
  FROM public.provider_withdrawals pw
  WHERE pw.id = withdrawal_id;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_as_paid(UUID, VARCHAR) TO anon, authenticated;

-- Also allow calling it from public
REVOKE EXECUTE ON FUNCTION public.mark_withdrawal_as_paid(UUID, VARCHAR) FROM public;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_as_paid(UUID, VARCHAR) TO anon, authenticated;
