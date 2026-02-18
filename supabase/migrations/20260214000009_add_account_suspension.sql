-- =====================================================
-- Add Account Suspension Support
-- Migration: Add is_active field to patients and providers
-- Created: 2026-02-14
-- =====================================================

-- Add is_active to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
-- Add is_active to providers table
ALTER TABLE public.providers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patients_is_active ON patients(is_active);
CREATE INDEX IF NOT EXISTS idx_providers_is_active ON providers(is_active);
