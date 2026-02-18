-- ================================================================
-- FIX: PATIENT VERIFICATION STATUS - HANDLE 'VERIFIED' VALUE
-- ================================================================
-- Some records may have been manually set to 'verified' instead of
-- valid values. This migration:
-- 1. Adds 'verified' as a valid value (for backward compatibility)
-- 2. Or converts 'verified' to 'approved' (recommended)

-- Option: Update any 'verified' records to 'approved'
-- (assuming 'verified' was meant to be the same as 'approved')
UPDATE patients 
SET verification_status = 'approved'
WHERE verification_status = 'verified';
-- Update the check constraint to include 'verified' as valid value
-- (in case it was intentional, for backward compatibility)
ALTER TABLE patients 
DROP CONSTRAINT IF EXISTS patients_verification_status_check;
ALTER TABLE patients 
ADD CONSTRAINT patients_verification_status_check 
CHECK (verification_status IN ('pending', 'approved', 'rejected', 'verified') OR verification_status IS NULL);
-- Recreate index
DROP INDEX IF EXISTS idx_patients_verification_status;
CREATE INDEX idx_patients_verification_status ON patients(verification_status);
