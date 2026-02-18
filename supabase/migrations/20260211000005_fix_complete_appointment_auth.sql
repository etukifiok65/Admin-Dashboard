-- =====================================================
-- Fix complete_appointment Authorization
-- Migration: 20260211000005
-- Purpose: Allow both patients and providers to complete appointments
-- =====================================================

-- Update complete_appointment to allow both patient and provider
CREATE OR REPLACE FUNCTION complete_appointment(appointment_id_param UUID)
RETURNS JSON AS $$
DECLARE
    appointment RECORD;
    provider_auth_id UUID;
    patient_auth_id UUID;
    current_auth_id UUID;
BEGIN
    -- Get current user's auth ID
    SELECT auth.uid() INTO current_auth_id;
    
    -- Get and lock the appointment
    SELECT * INTO appointment 
    FROM appointments 
    WHERE id = appointment_id_param 
    FOR UPDATE;
    
    IF appointment IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Appointment not found');
    END IF;
    
    -- Get provider and patient auth IDs for this appointment
    SELECT auth_id INTO provider_auth_id FROM providers WHERE id = appointment.provider_id;
    SELECT auth_id INTO patient_auth_id FROM patients WHERE id = appointment.patient_id;
    
    -- Verify that either the provider OR the patient owns this appointment
    IF current_auth_id != provider_auth_id AND current_auth_id != patient_auth_id THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    IF appointment.status = 'Completed' THEN
        RETURN json_build_object('success', false, 'error', 'Appointment already completed');
    END IF;
    
    IF appointment.status = 'Cancelled' THEN
        RETURN json_build_object('success', false, 'error', 'Cannot complete cancelled appointment');
    END IF;

    -- Update appointment status
    UPDATE appointments
    SET status = 'Completed', 
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = appointment_id_param;

    -- Update provider earnings
    UPDATE provider_earnings
    SET total_earnings = total_earnings + COALESCE(appointment.total_cost, 0),
        completed_visits = completed_visits + 1,
        updated_at = NOW()
    WHERE provider_id = appointment.provider_id;

    -- Credit wallet (automatically deducts 20% platform fee)
    PERFORM credit_wallet_from_earning(
        appointment.provider_id,
        appointment_id_param,
        COALESCE(appointment.total_cost, 0)
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Appointment completed successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
