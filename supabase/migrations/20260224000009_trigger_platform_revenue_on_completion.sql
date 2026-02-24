-- Add trigger to log platform revenue when appointment is completed
-- This ensures platform revenue is tracked regardless of completion method
-- (provider app, admin dashboard, etc.)

CREATE OR REPLACE FUNCTION log_platform_revenue_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    platform_commission DECIMAL(12,2);
BEGIN
    -- Only process if status changed to 'Completed' and wasn't already completed
    IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
        -- Calculate platform commission (20%)
        platform_commission := ROUND(COALESCE(NEW.total_cost, 0)::NUMERIC * 0.20, 2);
        
        -- Log platform revenue
        -- Check if already logged to prevent duplicates
        IF NOT EXISTS (
            SELECT 1 
            FROM platform_revenue_logs 
            WHERE revenue_type = 'appointment_commission' 
              AND related_appointment_id = NEW.id
        ) THEN
            INSERT INTO platform_revenue_logs (
                revenue_type,
                amount,
                related_appointment_id,
                description
            )
            VALUES (
                'appointment_commission',
                platform_commission,
                NEW.id,
                'Platform commission (20% of appointment total: ' || COALESCE(NEW.total_cost, 0)::text || ')'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_log_platform_revenue_on_completion ON appointments;

-- Create trigger that fires AFTER appointment is updated
CREATE TRIGGER trigger_log_platform_revenue_on_completion
    AFTER UPDATE ON appointments
    FOR EACH ROW
    WHEN (NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed'))
    EXECUTE FUNCTION log_platform_revenue_on_completion();
