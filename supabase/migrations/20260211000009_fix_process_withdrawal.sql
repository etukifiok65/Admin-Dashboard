-- =====================================================
-- Fix process_withdrawal Function Column Name
-- Migration: 20260211000009
-- Purpose: Update process_withdrawal to use processed_at instead of paid_at
-- =====================================================

CREATE OR REPLACE FUNCTION process_withdrawal(withdrawal_id_param UUID)
RETURNS JSON AS $$
DECLARE
    withdrawal RECORD;
BEGIN
    -- Get and lock withdrawal
    SELECT * INTO withdrawal 
    FROM provider_withdrawals 
    WHERE id = withdrawal_id_param 
    FOR UPDATE;

    IF withdrawal IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Withdrawal not found');
    END IF;

    IF withdrawal.status != 'Pending' THEN
        RETURN json_build_object('success', false, 'error', 'Withdrawal already processed');
    END IF;

    -- Update withdrawal status to Paid
    UPDATE provider_withdrawals
    SET status = 'Paid',
        processed_at = NOW()
    WHERE id = withdrawal_id_param;

    RETURN json_build_object(
        'success', true,
        'message', 'Withdrawal marked as paid'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
