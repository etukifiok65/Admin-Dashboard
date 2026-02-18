-- =====================================================
-- Fix is_active defaults for existing accounts
-- Ensures existing patients/providers are treated as active
-- =====================================================

-- Patients
ALTER TABLE public.patients
ALTER COLUMN is_active SET DEFAULT TRUE;
UPDATE public.patients
SET is_active = TRUE
WHERE is_active IS NULL;
ALTER TABLE public.patients
ALTER COLUMN is_active SET NOT NULL;
-- Providers
ALTER TABLE public.providers
ALTER COLUMN is_active SET DEFAULT TRUE;
UPDATE public.providers
SET is_active = TRUE
WHERE is_active IS NULL;
ALTER TABLE public.providers
ALTER COLUMN is_active SET NOT NULL;
