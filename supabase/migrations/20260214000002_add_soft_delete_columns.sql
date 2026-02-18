-- =====================================================
-- Add Soft Delete Columns
-- Migration: Add is_deleted to patients and providers
-- Created: 2026-02-14
-- =====================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_patients_is_deleted ON public.patients(is_deleted);
CREATE INDEX IF NOT EXISTS idx_providers_is_deleted ON public.providers(is_deleted);
