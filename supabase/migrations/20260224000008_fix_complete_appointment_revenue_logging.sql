-- Fix complete_appointment to properly log platform revenue
-- Issue: Migration 20260211000006 has a trigger that updates provider_earnings
-- This function shouldn't duplicate that update

CREATE OR REPLACE FUNCTION complete_appointment(appointment_id_param UUID)
RETURNS JSON AS $$
DECLARE
    appointment RECORD;
    provider_auth_id UUID;
    platform_commission DECIMAL(10,2);
BEGIN
    -- Get current user's provider ID
    SELECT id INTO provider_auth_id FROM providers WHERE auth_id = auth.uid();
    
    -- Get and lock the appointment
    SELECT * INTO appointment 
    FROM appointments 
    WHERE id = appointment_id_param 
    FOR UPDATE;
    
    IF appointment IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Appointment not found');
    END IF;
    
    -- Verify provider owns this appointment
    IF appointment.provider_id != provider_auth_id THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    IF appointment.status = 'Completed' THEN
        RETURN json_build_object('success', false, 'error', 'Appointment already completed');
    END IF;
    
    IF appointment.status = 'Cancelled' THEN
        RETURN json_build_object('success', false, 'error', 'Cannot complete cancelled appointment');
    END IF;

    -- Calculate platform commission (20%)
    platform_commission := ROUND(COALESCE(appointment.total_cost, 0)::NUMERIC * 0.20, 2);

    -- Update appointment status
    -- Note: trigger_auto_credit_provider_wallet will handle:
    -- - Wallet crediting via credit_wallet_from_earning()
    -- - Provider earnings update
    UPDATE appointments
    SET status = 'Completed', 
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = appointment_id_param;

    -- Log platform revenue (20% commission)
    -- Insert regardless of amount to track all completions
    INSERT INTO platform_revenue_logs (
        revenue_type,
        amount,
        related_appointment_id,
        description
    )
    VALUES (
        'appointment_commission',
        platform_commission,
        appointment_id_param,
        'Platform commission (20% of appointment total: ' || COALESCE(appointment.total_cost, 0)::text || ')'
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Appointment completed successfully',
        'platformCommission', platform_commission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
