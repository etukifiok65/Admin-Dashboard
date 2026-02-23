-- Admin appointment cancellation with configurable wallet refund

CREATE OR REPLACE FUNCTION admin_cancel_appointment(
    appointment_id_param UUID,
    cancellation_reason_param TEXT DEFAULT NULL,
    refund_percentage_param NUMERIC DEFAULT 100
)
RETURNS JSON AS $$
DECLARE
    appointment RECORD;
    requester_role TEXT;
    refund_amount DECIMAL(10,2);
    deduction_amount DECIMAL(10,2);
    provider_credit_amount DECIMAL(10,2);
    platform_fee_amount DECIMAL(10,2);
    safe_refund_percentage NUMERIC(5,2);
BEGIN
    -- Verify requester is active admin
    SELECT role
    INTO requester_role
    FROM admin_users
    WHERE auth_id = auth.uid()
      AND is_active = true
    LIMIT 1;

    IF requester_role IS NULL OR requester_role NOT IN ('super_admin', 'admin', 'moderator') THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- Validate percentage input
    safe_refund_percentage := ROUND(COALESCE(refund_percentage_param, 100)::NUMERIC, 2);
    IF safe_refund_percentage < 0 OR safe_refund_percentage > 100 THEN
        RETURN json_build_object('success', false, 'error', 'Refund percentage must be between 0 and 100');
    END IF;

    -- Get and lock appointment
    SELECT *
    INTO appointment
    FROM appointments
    WHERE id = appointment_id_param
    FOR UPDATE;

    IF appointment IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Appointment not found');
    END IF;

    -- Admin cancellation with refund is only allowed for scheduled appointments
    IF appointment.status != 'Scheduled' THEN
        RETURN json_build_object('success', false, 'error', 'Only scheduled appointments can be cancelled from admin with refund');
    END IF;

    refund_amount := ROUND((COALESCE(appointment.total_cost, 0)::NUMERIC * safe_refund_percentage) / 100, 2);

    -- Calculate deduction (non-refunded portion)
    deduction_amount := ROUND(COALESCE(appointment.total_cost, 0)::NUMERIC - refund_amount, 2);

    -- Platform fee: 20% of deduction
    platform_fee_amount := ROUND(deduction_amount::NUMERIC * 0.20, 2);

    -- Provider credit: deduction amount minus 20% platform fee (80% of deduction)
    provider_credit_amount := ROUND(deduction_amount::NUMERIC * 0.80, 2);

    UPDATE appointments
    SET status = 'Cancelled',
        cancelled_at = NOW(),
        cancellation_reason = COALESCE(cancellation_reason_param, 'Cancelled by admin dashboard'),
        updated_at = NOW()
    WHERE id = appointment_id_param;

    IF refund_amount > 0 THEN
        UPDATE patient_wallet
        SET balance = balance + refund_amount,
            updated_at = NOW()
        WHERE patient_id = appointment.patient_id;

        -- Idempotent insert guard by appointment reference + refund type
        IF NOT EXISTS (
            SELECT 1
            FROM transactions
            WHERE type = 'refund'
              AND reference = appointment_id_param::text
        ) THEN
            INSERT INTO transactions (patient_id, type, amount, description, status, reference)
            VALUES (
                appointment.patient_id,
                'refund',
                refund_amount,
                'Admin appointment cancellation refund',
                'completed',
                appointment_id_param::text
            );
        END IF;
    END IF;

    -- If there's a deduction, credit provider wallet (80% of deduction)
    IF deduction_amount > 0 AND provider_credit_amount > 0 THEN
        UPDATE provider_wallet
        SET balance = balance + provider_credit_amount,
            updated_at = NOW()
        WHERE provider_id = appointment.provider_id;

        -- Log provider credit as transaction
        IF NOT EXISTS (
            SELECT 1
            FROM transactions
            WHERE type = 'credit'
              AND reference = appointment_id_param::text || '_provider_deduction'
        ) THEN
            INSERT INTO transactions (provider_id, type, amount, description, status, reference)
            VALUES (
                appointment.provider_id,
                'credit',
                provider_credit_amount,
                'Cancellation deduction credit (80% of ' || deduction_amount::text || ')',
                'completed',
                appointment_id_param::text || '_provider_deduction'
            );
        END IF;
    END IF;

    RETURN json_build_object(
        'success', true,
        'refundAmount', refund_amount,
        'deductionAmount', deduction_amount,
        'providerCreditAmount', provider_credit_amount,
        'platformFeeAmount', platform_fee_amount,
        'refundPercentage', safe_refund_percentage,
        'message', 'Appointment cancelled and refund processed successfully',
        'breakdown', CASE
          WHEN deduction_amount > 0 THEN
            'Patient refunded: ' || refund_amount::text || ', Provider credited: ' || provider_credit_amount::text || ' (20% platform fee: ' || platform_fee_amount::text || ')'
          ELSE
            'Patient refunded: ' || refund_amount::text
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
