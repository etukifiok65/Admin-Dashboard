-- Add location tracking setting for providers
-- Required for provider privacy/security screen parity with patient settings.

ALTER TABLE provider_settings
  ADD COLUMN IF NOT EXISTS location_tracking BOOLEAN DEFAULT FALSE;
