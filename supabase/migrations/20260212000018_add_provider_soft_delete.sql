-- =====================================================
-- Add Soft Delete Columns to Providers
-- =====================================================
-- Adds is_deleted + deleted_at to support soft deletion.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_providers_is_deleted ON public.providers(is_deleted);
