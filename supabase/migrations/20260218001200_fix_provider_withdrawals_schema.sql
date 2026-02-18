-- =====================================================
-- Fix provider_withdrawals Table Schema
-- Migration: 20260218001200_fix_provider_withdrawals_schema.sql
-- Purpose: Add missing updated_at column and fix trigger
-- =====================================================

-- Add missing updated_at column
ALTER TABLE public.provider_withdrawals 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop the old trigger that references non-existent column
DROP TRIGGER IF EXISTS provider_withdrawals_updated_at ON public.provider_withdrawals;

-- Drop and recreate the trigger function with proper implementation
DROP FUNCTION IF EXISTS update_provider_withdrawals_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION update_provider_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER provider_withdrawals_updated_at
  BEFORE UPDATE ON public.provider_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_withdrawals_updated_at();

-- Verify the column has been added by setting updated_at on existing rows
UPDATE public.provider_withdrawals 
SET updated_at = NOW() 
WHERE updated_at IS NULL;
