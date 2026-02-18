-- =====================================================
-- Add Missing Transactions INSERT Policy
-- Migration: 20260210000001
-- Purpose: Allow patients to insert their own transaction records
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Patients can insert own transactions" ON transactions;
CREATE POLICY "Patients can insert own transactions"
    ON transactions FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
