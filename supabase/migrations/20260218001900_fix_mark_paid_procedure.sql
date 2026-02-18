-- =====================================================
-- Fix Mark as Paid Stored Procedure
-- Migration: 20260218001900_fix_mark_paid_procedure.sql
-- Purpose: Fix ambiguous column reference error with proper parameter names
-- =====================================================

-- Drop the old function
DROP FUNCTION IF EXISTS public.mark_withdrawal_as_paid(UUID, VARCHAR);

-- Create the corrected function
CREATE FUNCTION public.mark_withdrawal_as_paid(
  p_withdrawal_id UUID,
  p_new_status VARCHAR DEFAULT 'Paid'
)
RETURNS TABLE (
  out_id UUID,
  out_provider_id UUID,
  out_amount NUMERIC,
  out_status VARCHAR,
  out_requested_at TIMESTAMPTZ,
  out_processed_at TIMESTAMPTZ,
  out_payout_method_id UUID,
  out_admin_note TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the withdrawal record
  UPDATE public.provider_withdrawals
  SET 
    status = p_new_status,
    processed_at = CASE 
      WHEN p_new_status = 'Paid' THEN NOW()
      ELSE processed_at
    END,
    updated_at = NOW()
  WHERE public.provider_withdrawals.id = p_withdrawal_id;

  -- Return the updated record
  RETURN QUERY
  SELECT 
    public.provider_withdrawals.id,
    public.provider_withdrawals.provider_id,
    public.provider_withdrawals.amount,
    public.provider_withdrawals.status,
    public.provider_withdrawals.requested_at,
    public.provider_withdrawals.processed_at,
    public.provider_withdrawals.payout_method_id,
    public.provider_withdrawals.admin_note
  FROM public.provider_withdrawals
  WHERE public.provider_withdrawals.id = p_withdrawal_id;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_as_paid(UUID, VARCHAR) TO anon, authenticated;
