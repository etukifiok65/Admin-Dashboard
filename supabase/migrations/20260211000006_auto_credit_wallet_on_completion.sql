-- =====================================================
-- Auto-Credit Provider Wallet on Appointment Completion
-- Migration: 20260211000006
-- Purpose: Use database trigger to automatically credit provider wallet
--          when appointment status changes to 'Completed'
-- =====================================================

-- Create trigger function to auto-credit wallet when appointment completed
CREATE OR REPLACE FUNCTION auto_credit_provider_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if status changed to 'Completed' and wasn't already completed
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
        -- Call the wallet crediting function
        PERFORM credit_wallet_from_earning(
            NEW.provider_id,
            NEW.id,
            COALESCE(NEW.total_cost, 0)
        );
        
        -- Update provider earnings
        UPDATE provider_earnings
        SET total_earnings = total_earnings + COALESCE(NEW.total_cost, 0),
            completed_visits = completed_visits + 1,
            updated_at = NOW()
        WHERE provider_id = NEW.provider_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_credit_provider_wallet ON appointments;
-- Create trigger that fires AFTER appointment is updated
CREATE TRIGGER trigger_auto_credit_provider_wallet
    AFTER UPDATE ON appointments
    FOR EACH ROW
    WHEN (NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed'))
    EXECUTE FUNCTION auto_credit_provider_wallet();
