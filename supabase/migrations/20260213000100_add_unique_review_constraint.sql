-- Add unique constraint to prevent multiple reviews for the same appointment by same patient
-- This ensures one review per appointment per patient

-- First, check if there are any duplicate reviews that would violate the constraint
-- If duplicates exist, keep the first review (earliest created_at) and delete others
DELETE FROM reviews
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY appointment_id, patient_id ORDER BY created_at) AS rn
    FROM reviews
    WHERE appointment_id IS NOT NULL
  ) sub
  WHERE rn > 1
);
-- Add the unique constraint using a unique index
-- This allows:
-- - Multiple reviews from same patient for different appointments (different appointment_ids)
-- - One review per patient per appointment (enforces uniqueness on appointment_id + patient_id)
-- Note: appointment_id can be null for legacy reviews not tied to specific appointments
CREATE UNIQUE INDEX IF NOT EXISTS unique_appointment_patient_review 
ON reviews(appointment_id, patient_id) 
WHERE appointment_id IS NOT NULL;
