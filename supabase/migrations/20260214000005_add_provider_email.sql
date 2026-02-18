-- Migration: Add email to providers and backfill from auth.users

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS email TEXT;
CREATE INDEX IF NOT EXISTS idx_providers_email ON public.providers(email);
UPDATE public.providers p
SET email = u.email
FROM auth.users u
WHERE p.auth_id = u.id
  AND p.email IS NULL;
