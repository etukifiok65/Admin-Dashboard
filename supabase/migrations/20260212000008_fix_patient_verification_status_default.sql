-- ================================================================
-- FIX: PATIENT VERIFICATION STATUS DEFAULT VALUE
-- ================================================================
-- Problem: verification_status defaulted to 'pending', so new patients 
-- were routed to verification-pending even without submitting documents
-- Solution: Change default to NULL, document submission sets it to 'pending'

-- Step 1: Drop the old check constraint (restrictive, doesn't allow NULL result of default)
ALTER TABLE patients 
DROP CONSTRAINT IF EXISTS patients_verification_status_check;
-- Step 2: Add new check constraint that allows NULL
ALTER TABLE patients 
ADD CONSTRAINT patients_verification_status_check 
CHECK (verification_status IN ('pending', 'approved', 'rejected') OR verification_status IS NULL);
-- Step 3: Set default to NULL for new records
ALTER TABLE patients 
ALTER COLUMN verification_status SET DEFAULT NULL;
-- Step 4: Reset existing 'pending' records to NULL (they will be set to 'pending' again
-- when the user actually submits documents via submitIdentityDocument())
-- Only do this if they haven't actually submitted documents yet
-- For safety, we only update records where email hasn't been verified yet
UPDATE patients 
SET verification_status = NULL
WHERE verification_status = 'pending' 
  AND email_verified = FALSE;
-- Recreate index for performance
DROP INDEX IF EXISTS idx_patients_verification_status;
CREATE INDEX idx_patients_verification_status ON patients(verification_status);
