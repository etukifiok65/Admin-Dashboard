-- =====================================================
-- Remote Procedure Call (RPC) Functions
-- Migration: Business Logic Functions
-- Created: 2026-02-08
-- =====================================================

-- =====================================================
-- PROVIDER RATING & REVIEW FUNCTIONS
-- =====================================================

-- Get provider rating statistics
CREATE OR REPLACE FUNCTION get_provider_rating_stats(provider_id_param UUID)
RETURNS JSON AS $$
DECLARE
    total_reviews INT;
    avg_rating DECIMAL;
    rating_distribution JSONB;
BEGIN
    SELECT COUNT(*), ROUND(AVG(rating)::NUMERIC, 2)
    INTO total_reviews, avg_rating
    FROM reviews WHERE provider_id = provider_id_param;

    SELECT jsonb_object_agg(rating, count)
    INTO rating_distribution
    FROM (
        SELECT rating, COUNT(*) as count
        FROM reviews WHERE provider_id = provider_id_param
        GROUP BY rating
    ) t;

    RETURN json_build_object(
        'totalReviews', COALESCE(total_reviews, 0),
        'avgRating', COALESCE(avg_rating, 0),
        'distribution', COALESCE(rating_distribution, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- APPOINTMENT MANAGEMENT FUNCTIONS
-- =====================================================

-- Cancel appointment with automatic refund
CREATE OR REPLACE FUNCTION cancel_appointment(
    appointment_id_param UUID,
    cancellation_reason_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    appointment RECORD;
    refund_amount DECIMAL;
    patient_auth_id UUID;
BEGIN
    -- Get current user's patient ID
    SELECT id INTO patient_auth_id FROM patients WHERE auth_id = auth.uid();
    
    -- Get and lock the appointment
    SELECT * INTO appointment 
    FROM appointments 
    WHERE id = appointment_id_param 
    FOR UPDATE;
    
    IF appointment IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Appointment not found');
    END IF;
    
    -- Verify patient owns this appointment
    IF appointment.patient_id != patient_auth_id THEN
        RETURN json_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    
    IF appointment.status = 'Cancelled' THEN
        RETURN json_build_object('success', false, 'error', 'Appointment already cancelled');
    END IF;
    
    IF appointment.status = 'Completed' THEN
        RETURN json_build_object('success', false, 'error', 'Cannot cancel completed appointment');
    END IF;

    refund_amount := COALESCE(appointment.total_cost, 0);
    
    -- Update appointment status
    UPDATE appointments
    SET status = 'Cancelled', 
        cancelled_at = NOW(), 
        cancellation_reason = cancellation_reason_param,
        updated_at = NOW()
    WHERE id = appointment_id_param;

    -- Refund to wallet if there was a cost
    IF refund_amount > 0 THEN
        UPDATE patient_wallet
        SET balance = balance + refund_amount,
            updated_at = NOW()
        WHERE patient_id = appointment.patient_id;

        -- Create refund transaction
        INSERT INTO transactions (patient_id, type, amount, description, status, reference)
        VALUES (
            appointment.patient_id, 
            'refund', 
            refund_amount, 
            'Appointment cancellation refund', 
            'completed', 
            appointment_id_param::text
        );
    END IF;

    RETURN json_build_object(
        'success', true, 
        'refundAmount', refund_amount,
        'message', 'Appointment cancelled successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Get upcoming appointments for provider
CREATE OR REPLACE FUNCTION get_upcoming_appointments(provider_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    patient_id UUID,
    patient_name TEXT,
    service_type TEXT,
    scheduled_date DATE,
    scheduled_time TIME,
    status TEXT,
    location TEXT,
    notes TEXT,
    urgency_level TEXT,
    total_cost DECIMAL
) AS $$
DECLARE
    provider_auth_id UUID;
BEGIN
    -- If no provider_id provided, get from auth context
    IF provider_id_param IS NULL THEN
        SELECT p.id INTO provider_id_param 
        FROM providers p 
        WHERE p.auth_id = auth.uid();
    END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.patient_id,
        pt.name as patient_name,
        a.service_type,
        a.scheduled_date,
        a.scheduled_time,
        a.status,
        a.location,
        a.notes,
        a.urgency_level,
        a.total_cost
    FROM appointments a
    JOIN patients pt ON a.patient_id = pt.id
    WHERE a.provider_id = provider_id_param
        AND a.scheduled_date >= CURRENT_DATE
        AND a.status IN ('Scheduled', 'Requested')
    ORDER BY a.scheduled_date, a.scheduled_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Complete appointment and update provider earnings
CREATE OR REPLACE FUNCTION complete_appointment(appointment_id_param UUID)
RETURNS JSON AS $$
DECLARE
    appointment RECORD;
    provider_auth_id UUID;
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

    RETURN json_build_object(
        'success', true,
        'message', 'Appointment completed successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- PROVIDER SEARCH & DISCOVERY FUNCTIONS
-- =====================================================

-- Search providers with filters
CREATE OR REPLACE FUNCTION search_providers(
    search_query TEXT DEFAULT NULL,
    service_type_param TEXT DEFAULT NULL,
    state_param TEXT DEFAULT NULL,
    min_rating_param DECIMAL DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    specialty TEXT,
    qualification TEXT,
    experience TEXT,
    about TEXT,
    languages TEXT[],
    specializations TEXT[],
    profile_image_url TEXT,
    avg_rating DECIMAL,
    total_reviews INT,
    is_verified BOOLEAN,
    min_service_rate DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.specialty,
        p.qualification,
        p.experience,
        p.about,
        p.languages,
        p.specializations,
        p.profile_image_url,
        COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) as avg_rating,
        COUNT(DISTINCT r.id)::INT as total_reviews,
        p.is_verified,
        COALESCE(MIN(sr.base_rate), 0) as min_service_rate
    FROM providers p
    LEFT JOIN reviews r ON p.id = r.provider_id
    LEFT JOIN service_rates sr ON p.id = sr.provider_id AND sr.is_active = TRUE
    LEFT JOIN provider_service_areas psa ON p.id = psa.provider_id AND psa.is_active = TRUE
    WHERE p.is_verified = TRUE
        AND p.account_status = 'approved'
        AND (search_query IS NULL OR 
             p.name ILIKE '%' || search_query || '%' OR 
             p.specialty ILIKE '%' || search_query || '%' OR
             p.about ILIKE '%' || search_query || '%')
        AND (state_param IS NULL OR psa.state = state_param)
    GROUP BY p.id, p.name, p.specialty, p.qualification, p.experience, p.about, 
             p.languages, p.specializations, p.profile_image_url, p.is_verified
    HAVING (AVG(r.rating) >= min_rating_param OR AVG(r.rating) IS NULL)
    ORDER BY avg_rating DESC NULLS LAST, total_reviews DESC, p.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Get provider details with full information
CREATE OR REPLACE FUNCTION get_provider_details(provider_id_param UUID)
RETURNS JSON AS $$
DECLARE
    provider_data JSON;
    rating_stats JSON;
    service_rates_data JSON;
    service_areas_data JSON;
    availability_data JSON;
BEGIN
    -- Get provider basic info
    SELECT json_build_object(
        'id', p.id,
        'name', p.name,
        'specialty', p.specialty,
        'qualification', p.qualification,
        'experience', p.experience,
        'about', p.about,
        'bio', p.bio,
        'languages', p.languages,
        'specializations', p.specializations,
        'profileImageUrl', p.profile_image_url,
        'isVerified', p.is_verified,
        'phoneNumber', p.phone_number
    ) INTO provider_data
    FROM providers p
    WHERE p.id = provider_id_param
        AND p.is_verified = TRUE
        AND p.account_status = 'approved';

    IF provider_data IS NULL THEN
        RETURN json_build_object('error', 'Provider not found');
    END IF;

    -- Get rating stats
    SELECT get_provider_rating_stats(provider_id_param) INTO rating_stats;

    -- Get service rates
    SELECT json_agg(json_build_object(
        'id', sr.id,
        'title', sr.title,
        'description', sr.description,
        'baseRate', sr.base_rate,
        'minimumRate', sr.minimum_rate,
        'maximumRate', sr.maximum_rate,
        'currency', sr.currency
    )) INTO service_rates_data
    FROM service_rates sr
    WHERE sr.provider_id = provider_id_param AND sr.is_active = TRUE;

    -- Get service areas
    SELECT json_agg(json_build_object(
        'country', psa.country,
        'state', psa.state,
        'travelRadius', psa.travel_radius
    )) INTO service_areas_data
    FROM provider_service_areas psa
    WHERE psa.provider_id = provider_id_param AND psa.is_active = TRUE;

    -- Get availability
    SELECT json_agg(json_build_object(
        'day', pa.day_of_week,
        'isAvailable', pa.is_available,
        'timeSlots', (
            SELECT json_agg(json_build_object(
                'startTime', pts.start_time,
                'endTime', pts.end_time
            ))
            FROM provider_time_slots pts
            WHERE pts.availability_id = pa.id
        )
    ) ORDER BY 
        CASE pa.day_of_week
            WHEN 'Monday' THEN 1
            WHEN 'Tuesday' THEN 2
            WHEN 'Wednesday' THEN 3
            WHEN 'Thursday' THEN 4
            WHEN 'Friday' THEN 5
            WHEN 'Saturday' THEN 6
            WHEN 'Sunday' THEN 7
        END
    ) INTO availability_data
    FROM provider_availability pa
    WHERE pa.provider_id = provider_id_param;

    RETURN json_build_object(
        'provider', provider_data,
        'ratings', rating_stats,
        'serviceRates', COALESCE(service_rates_data, '[]'::json),
        'serviceAreas', COALESCE(service_areas_data, '[]'::json),
        'availability', COALESCE(availability_data, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- PAYMENT & PAYOUT FUNCTIONS
-- =====================================================

-- Request provider payout
CREATE OR REPLACE FUNCTION request_provider_payout(
    amount_param DECIMAL,
    payout_method_id_param UUID
)
RETURNS JSON AS $$
DECLARE
    payout_id UUID;
    earnings RECORD;
    provider_id_param UUID;
BEGIN
    -- Get current user's provider ID
    SELECT id INTO provider_id_param FROM providers WHERE auth_id = auth.uid();
    
    IF provider_id_param IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Provider not found');
    END IF;

    -- Check earnings
    SELECT * INTO earnings 
    FROM provider_earnings 
    WHERE provider_id = provider_id_param 
    FOR UPDATE;
    
    IF earnings.total_earnings < amount_param THEN
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient earnings for payout request',
            'availableBalance', earnings.total_earnings
        );
    END IF;

    -- Verify payout method belongs to provider
    IF NOT EXISTS(
        SELECT 1 FROM provider_payout_methods 
        WHERE id = payout_method_id_param 
        AND provider_id = provider_id_param
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Invalid payout method');
    END IF;

    -- Create payout request
    INSERT INTO provider_payouts (provider_id, payout_method_id, amount, status)
    VALUES (provider_id_param, payout_method_id_param, amount_param, 'pending')
    RETURNING id INTO payout_id;

    RETURN json_build_object(
        'success', true, 
        'payoutId', payout_id,
        'message', 'Payout request submitted successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Topup patient wallet
CREATE OR REPLACE FUNCTION topup_wallet(
    amount_param DECIMAL,
    payment_reference TEXT
)
RETURNS JSON AS $$
DECLARE
    patient_id_param UUID;
    transaction_id UUID;
BEGIN
    -- Get current user's patient ID
    SELECT id INTO patient_id_param FROM patients WHERE auth_id = auth.uid();
    
    IF patient_id_param IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Patient not found');
    END IF;

    IF amount_param <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Invalid amount');
    END IF;

    -- Update wallet balance
    UPDATE patient_wallet
    SET balance = balance + amount_param,
        updated_at = NOW()
    WHERE patient_id = patient_id_param;

    -- Create transaction record
    INSERT INTO transactions (patient_id, type, amount, description, status, reference)
    VALUES (
        patient_id_param, 
        'topup', 
        amount_param, 
        'Wallet top-up', 
        'completed', 
        payment_reference
    )
    RETURNING id INTO transaction_id;

    RETURN json_build_object(
        'success', true,
        'transactionId', transaction_id,
        'message', 'Wallet topped up successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- REVIEW MANAGEMENT FUNCTIONS
-- =====================================================

-- Add helpful vote to review (with toggle functionality)
CREATE OR REPLACE FUNCTION toggle_review_helpful(review_id_param UUID)
RETURNS JSON AS $$
DECLARE
    patient_id_param UUID;
    vote_exists BOOLEAN;
BEGIN
    -- Get current user's patient ID
    SELECT id INTO patient_id_param FROM patients WHERE auth_id = auth.uid();
    
    IF patient_id_param IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Patient not found');
    END IF;

    -- Check if vote already exists
    SELECT EXISTS(
        SELECT 1 FROM review_helpful_votes 
        WHERE review_id = review_id_param 
        AND patient_id = patient_id_param
    ) INTO vote_exists;

    IF vote_exists THEN
        -- Remove vote
        DELETE FROM review_helpful_votes
        WHERE review_id = review_id_param AND patient_id = patient_id_param;
        
        -- Decrement helpful count
        UPDATE reviews
        SET helpful_count = GREATEST(helpful_count - 1, 0)
        WHERE id = review_id_param;
        
        RETURN json_build_object('success', true, 'action', 'removed');
    ELSE
        -- Add vote
        INSERT INTO review_helpful_votes (review_id, patient_id)
        VALUES (review_id_param, patient_id_param);
        
        -- Increment helpful count
        UPDATE reviews
        SET helpful_count = helpful_count + 1
        WHERE id = review_id_param;
        
        RETURN json_build_object('success', true, 'action', 'added');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- =====================================================
-- END OF RPC FUNCTIONS
-- =====================================================;
