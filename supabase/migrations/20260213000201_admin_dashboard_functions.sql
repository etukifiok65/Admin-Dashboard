-- =====================================================
-- Admin Dashboard RPC Functions
-- Migration: Create admin dashboard utility functions
-- Created: 2026-02-13
-- =====================================================

-- Function: Get admin dashboard metrics
CREATE OR REPLACE FUNCTION public.get_admin_metrics()
RETURNS TABLE (
    total_users BIGINT,
    active_patients BIGINT,
    verified_providers BIGINT,
    pending_providers BIGINT,
    today_appointments BIGINT,
    today_revenue NUMERIC,
    month_revenue NUMERIC,
    average_rating NUMERIC
) AS $$
DECLARE
    v_today DATE;
    v_month_start DATE;
BEGIN
    v_today := CURRENT_DATE;
    v_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;

    RETURN QUERY
    SELECT
        -- Total users
        (SELECT COUNT(*) FROM public.patients WHERE is_deleted = FALSE) +
        (SELECT COUNT(*) FROM public.providers WHERE is_deleted = FALSE),
        
        -- Active patients (with appointments in last 30 days)
        (SELECT COUNT(DISTINCT patient_id) FROM public.appointments 
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'),
        
        -- Verified providers
        (SELECT COUNT(*) FROM public.providers 
         WHERE is_verified = TRUE AND is_deleted = FALSE),
        
        -- Pending providers
        (SELECT COUNT(*) FROM public.providers 
         WHERE account_status IN ('pending', 'document_pending', 'pending_approval')
         AND is_deleted = FALSE),
        
        -- Today's appointments
        (SELECT COUNT(*) FROM public.appointments 
         WHERE scheduled_date = v_today),
        
        -- Today's revenue
        COALESCE((SELECT SUM(amount) FROM public.transactions 
         WHERE status = 'completed' AND created_at >= v_today), 0),
        
        -- This month's revenue
        COALESCE((SELECT SUM(amount) FROM public.transactions 
         WHERE status = 'completed' 
         AND created_at >= v_month_start::TIMESTAMP WITH TIME ZONE), 0),
        
        -- Average rating
        COALESCE((SELECT AVG(rating) FROM public.reviews), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function: Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users
        WHERE auth_id = auth.uid()
        AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function: Get provider with stats
CREATE OR REPLACE FUNCTION public.get_provider_with_stats(p_provider_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    specialty TEXT,
    is_verified BOOLEAN,
    account_status TEXT,
    total_rating NUMERIC,
    review_count BIGINT,
    completed_visits BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.name,
        p.specialty,
        p.is_verified,
        p.account_status,
        COALESCE(AVG(r.rating), 0),
        COUNT(DISTINCT r.id),
        (SELECT COUNT(*) FROM public.appointments 
         WHERE provider_id = p.id AND status = 'completed')
    FROM public.providers p
    LEFT JOIN public.reviews r ON r.provider_id = p.id
    WHERE p.id = p_provider_id
    GROUP BY p.id, p.name, p.specialty, p.is_verified, p.account_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute permission to authenticated users who are admins
GRANT EXECUTE ON FUNCTION public.get_admin_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_with_stats(UUID) TO authenticated;
