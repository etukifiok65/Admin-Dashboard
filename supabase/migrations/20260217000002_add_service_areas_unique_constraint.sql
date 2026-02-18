-- Add UNIQUE constraint to prevent duplicate service areas per provider
-- This ensures each provider can only have one row per (country, state) combination

-- First, remove any remaining duplicates (keep the earliest one by created_at)
DELETE FROM provider_service_areas psa1
WHERE EXISTS (
  SELECT 1 FROM provider_service_areas psa2
  WHERE psa2.provider_id = psa1.provider_id
    AND psa2.country = psa1.country
    AND psa2.state = psa1.state
    AND psa2.created_at < psa1.created_at
);
-- Add the UNIQUE constraint
ALTER TABLE provider_service_areas
ADD CONSTRAINT unique_provider_service_area UNIQUE (provider_id, country, state);
-- Create index on (provider_id, state) for efficient filtering by location
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_provider_state 
  ON provider_service_areas(provider_id, state);
