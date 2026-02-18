-- Add provider profile fields and settings columns
-- Created: 2026-02-09

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE provider_settings
  ADD COLUMN IF NOT EXISTS biometric_auth BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_logout BOOLEAN DEFAULT FALSE;
