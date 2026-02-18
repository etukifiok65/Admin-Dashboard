-- Fix RLS policies for service_rates table to properly check auth user
-- The issue: we need to check if the auth user is the provider, not if auth.uid matches provider_id
-- Solution: Join with providers table to check auth_id

-- Drop existing service_rates policies
DROP POLICY IF EXISTS "Providers can view their own service rates" ON service_rates;
DROP POLICY IF EXISTS "Providers can insert their own service rates" ON service_rates;
DROP POLICY IF EXISTS "Providers can update their own service rates" ON service_rates;
DROP POLICY IF EXISTS "Providers can delete their own service rates" ON service_rates;
-- Create new policies that properly check authentication
CREATE POLICY "Providers can view their own service rates"
  ON service_rates FOR SELECT
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
CREATE POLICY "Providers can insert their own service rates"
  ON service_rates FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
CREATE POLICY "Providers can update their own service rates"
  ON service_rates FOR UPDATE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
CREATE POLICY "Providers can delete their own service rates"
  ON service_rates FOR DELETE
  TO authenticated
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
-- Allow public readers to see active service rates (for patient browsing)
-- This allows fetching providers offering each service without auth
CREATE POLICY "Service rates are viewable when service is active"
  ON service_rates FOR SELECT
  USING (is_active = true);
