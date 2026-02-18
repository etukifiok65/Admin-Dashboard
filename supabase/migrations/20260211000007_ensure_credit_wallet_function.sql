-- =====================================================
-- Ensure Provider Wallet Functions Exist
-- Migration: 20260211000007
-- Purpose: Recreate credit_wallet_from_earning function if missing
-- =====================================================

-- Drop and recreate the credit_wallet_from_earning function
DROP FUNCTION IF EXISTS credit_wallet_from_earning(UUID, UUID, NUMERIC);
CREATE OR REPLACE FUNCTION credit_wallet_from_earning(
    provider_id_param UUID,
    appointment_id_param UUID,
    gross_amount NUMERIC
)
RETURNS JSON AS $$
DECLARE
    net_amount NUMERIC;
    platform_fee NUMERIC;
    wallet RECORD;
BEGIN
    -- Calculate net amount after 20% platform fee
    platform_fee := gross_amount * 0.20;
    net_amount := gross_amount * 0.80;

    -- Get and lock wallet
    SELECT * INTO wallet 
    FROM provider_wallets 
    WHERE provider_id = provider_id_param 
    FOR UPDATE;

    IF wallet IS NULL THEN
        -- Create wallet if it doesn't exist
        INSERT INTO provider_wallets (provider_id, balance)
        VALUES (provider_id_param, net_amount)
        ON CONFLICT (provider_id) DO UPDATE SET balance = provider_wallets.balance + net_amount;
    ELSE
        -- Update existing wallet
        UPDATE provider_wallets
        SET balance = balance + net_amount,
            updated_at = NOW()
        WHERE provider_id = provider_id_param;
    END IF;

    -- Check if transaction already logged (idempotency check)
    IF NOT EXISTS (
        SELECT 1 FROM provider_transaction_logs 
        WHERE related_appointment_id = appointment_id_param 
        AND transaction_type = 'credit'
    ) THEN
        -- Log transaction
        INSERT INTO provider_transaction_logs (
            provider_id,
            transaction_type,
            amount,
            platform_fee_amount,
            related_appointment_id,
            description
        ) VALUES (
            provider_id_param,
            'credit',
            net_amount,
            platform_fee,
            appointment_id_param,
            'Earnings from completed appointment (20% fee deducted)'
        );
    END IF;

    RETURN json_build_object(
        'success', true,
        'grossAmount', gross_amount,
        'platformFee', platform_fee,
        'netAmount', net_amount,
        'message', 'Wallet credited successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
