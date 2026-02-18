-- =====================================================
-- Add Soft Delete Columns to Patients
-- =====================================================
-- Adds is_deleted + deleted_at to support soft deletion.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_patients_is_deleted ON public.patients(is_deleted);
