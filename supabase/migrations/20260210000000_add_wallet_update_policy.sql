-- =====================================================
-- Add Missing Patient Wallet UPDATE Policy
-- Migration: 20260210000000
-- Purpose: Allow patients to update their own wallet balance
-- =====================================================

-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Patients can update own wallet" ON patient_wallet;
