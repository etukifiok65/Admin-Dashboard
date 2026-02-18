-- =====================================================
-- Add Patient Email Column + Backfill
-- Migration: Add email to patients and backfill from auth.users
-- Created: 2026-02-14
-- =====================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_patients_email ON public.patients(email);
UPDATE public.patients p
SET email = u.email
FROM auth.users u
WHERE p.auth_id = u.id
  AND p.email IS NULL;
