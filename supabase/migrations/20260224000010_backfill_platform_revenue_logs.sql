-- Backfill platform revenue logs for completed appointments
-- This migration adds missing revenue logs for appointments that were completed
-- before the platform revenue logging system was implemented

DO $$
DECLARE
    completed_appointment RECORD;
    platform_commission DECIMAL(12,2);
    inserted_count INTEGER := 0;
BEGIN
    -- Loop through all completed appointments that don't have a revenue log
    FOR completed_appointment IN 
        SELECT a.id, a.total_cost
        FROM appointments a
        WHERE a.status = 'Completed'
          AND NOT EXISTS (
              SELECT 1 
              FROM platform_revenue_logs prl
              WHERE prl.revenue_type = 'appointment_commission'
                AND prl.related_appointment_id = a.id
          )
    LOOP
        -- Calculate platform commission (20%)
        platform_commission := ROUND(COALESCE(completed_appointment.total_cost, 0)::NUMERIC * 0.20, 2);
        
        -- Insert platform revenue log
        INSERT INTO platform_revenue_logs (
            revenue_type,
            amount,
            related_appointment_id,
            description
        )
        VALUES (
            'appointment_commission',
            platform_commission,
            completed_appointment.id,
            'Platform commission (20% of appointment total: ' || COALESCE(completed_appointment.total_cost, 0)::text || ') - BACKFILLED'
        );
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Backfilled platform revenue logs for % completed appointments', inserted_count;
END $$;
