-- ================================================================
-- FIX: PROVIDER ACCOUNT STATUS DEFAULT VALUE
-- ================================================================
-- Problem: account_status defaulted to 'pending' which isn't handled 
-- by the verification logic. Providers expect 'document_pending' 
-- (waiting for document submission) or other specific statuses.
-- Solution: Change default to 'document_pending' to match signup flow

-- Step 1: Drop the old check constraint (restrictive)
ALTER TABLE providers 
DROP CONSTRAINT IF EXISTS providers_account_status_check;
-- Step 2: Add new check constraint (same options, just re-created)
ALTER TABLE providers 
ADD CONSTRAINT providers_account_status_check 
CHECK (account_status IN ('pending', 'approved', 'rejected', 'document_pending', 'pending_approval'));
-- Step 3: Set default to 'document_pending' for new records (consistent with signup logic)
ALTER TABLE providers 
ALTER COLUMN account_status SET DEFAULT 'document_pending';
-- Step 4: Reset existing 'pending' records to 'document_pending' 
-- (they likely haven't submitted documents yet if they have 'pending' status)
UPDATE providers 
SET account_status = 'document_pending'
WHERE account_status = 'pending' 
  AND is_verified = FALSE;
-- Reinforce index for performance
DROP INDEX IF EXISTS idx_providers_account_status;
CREATE INDEX idx_providers_account_status ON providers(account_status);
