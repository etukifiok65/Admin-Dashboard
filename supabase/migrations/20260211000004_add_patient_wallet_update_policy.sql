-- =====================================================
-- Add Patient Wallet UPDATE Policy
-- Migration: 20260211000004
-- Purpose: Allow patients to update their own wallet balance
-- =====================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Patients can update own wallet" ON patient_wallet;
-- Create UPDATE policy for patient wallet
CREATE POLICY "Patients can update own wallet"
    ON patient_wallet FOR UPDATE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
