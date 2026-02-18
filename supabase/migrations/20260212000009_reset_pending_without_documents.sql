-- ================================================================
-- ADDITIONAL FIX: RESET PENDING STATUS FOR USERS WITHOUT DOCUMENTS
-- ================================================================
-- For patients who verified email but haven't had documents approved/rejected,
-- reset verification_status from 'pending' to NULL so they go to verify-identity
-- instead of verification-pending

-- This is a data cleanup for existing records before the fix was applied.
-- New records will automatically get NULL instead of 'pending' going forward.

UPDATE patients 
SET verification_status = NULL
WHERE verification_status = 'pending' 
  AND email_verified = TRUE;
