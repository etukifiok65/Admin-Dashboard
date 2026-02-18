-- =====================================================
-- Ensure Withdrawal RPC Functions Exist
-- Migration: 20260211000008
-- Purpose: Recreate request_provider_withdrawal function if missing
-- =====================================================

-- Drop and recreate the withdrawal request function
DROP FUNCTION IF EXISTS request_provider_withdrawal(UUID, NUMERIC, UUID);
CREATE OR REPLACE FUNCTION request_provider_withdrawal(
    provider_id_param UUID,
    amount_param NUMERIC,
    payout_method_id_param UUID
)
RETURNS JSON AS $$
DECLARE
    wallet RECORD;
    withdrawal_id UUID;
BEGIN
    -- Get and lock wallet to check balance
    SELECT * INTO wallet 
    FROM provider_wallets 
    WHERE provider_id = provider_id_param 
    FOR UPDATE;

    IF wallet IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Wallet not found'
        );
    END IF;

    -- Check balance
    IF wallet.balance < amount_param THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient balance',
            'availableBalance', wallet.balance
        );
    END IF;

    -- Deduct from wallet
    UPDATE provider_wallets
    SET balance = balance - amount_param,
        updated_at = NOW()
    WHERE provider_id = provider_id_param;

    -- Create withdrawal request
    INSERT INTO provider_withdrawals (
        provider_id,
        amount,
        payout_method_id,
        status
    ) VALUES (
        provider_id_param,
        amount_param,
        payout_method_id_param,
        'Pending'
    )
    RETURNING id INTO withdrawal_id;

    -- Log transaction
    INSERT INTO provider_transaction_logs (
        provider_id,
        transaction_type,
        amount,
        related_withdrawal_id,
        description
    ) VALUES (
        provider_id_param,
        'debit',
        amount_param,
        withdrawal_id,
        'Withdrawal request initiated'
    );

    RETURN json_build_object(
        'success', true,
        'withdrawalId', withdrawal_id,
        'message', 'Withdrawal request submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Process withdrawal (admin function)
DROP FUNCTION IF EXISTS process_withdrawal(UUID);
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
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = withdrawal_id_param;

    RETURN json_build_object(
        'success', true,
        'message', 'Withdrawal marked as paid'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
