-- Drop and recreate service_categories table with proper preset structure
DROP TABLE IF EXISTS service_categories CASCADE;
CREATE TABLE service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  min_rate DECIMAL(10,2) NOT NULL,
  max_rate DECIMAL(10,2) NOT NULL,
  duration TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- Insert the 4 preset service categories (these cannot be modified by providers)
INSERT INTO service_categories (name, description, min_rate, max_rate, duration, icon, color) VALUES
  ('Doctor Visit', 'Consultations, Examination and Follow-up for Existing Patients', 5000, 50000, '30-60 Minutes', 'stethoscope', '#10B981'),
  ('Nurse Care', 'General Nursing Care, Health Monitoring, Wound Dressing, Injection and Medication Management', 5000, 50000, '30-60 Minutes', 'heart', '#EF4444'),
  ('Home Care', 'Daily Care, Elderly Care, Companionship and Assistance', 5000, 50000, 'Daily', 'home', '#F59E0B'),
  ('Specialized Care', 'Mental Health Therapy, Physiotherapy, Supervision and Rehabilitation', 5000, 50000, 'Daily', 'activity', '#3B82F6')
ON CONFLICT (name) DO NOTHING;
-- Modify service_rates table to reference service_categories
-- Drop existing service_rates table if it exists and recreate with proper structure
DROP TABLE IF EXISTS service_rates CASCADE;
CREATE TABLE service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  service_category_id UUID NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  base_rate DECIMAL(10,2) NOT NULL CHECK (base_rate >= 0),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_provider_service UNIQUE(provider_id, service_category_id)
);
-- Add RLS policies for service_categories (read-only for all authenticated users)
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service categories are viewable by all authenticated users"
  ON service_categories FOR SELECT
  TO authenticated
  USING (true);
-- Add RLS policies for service_rates
ALTER TABLE service_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers can view their own service rates"
  ON service_rates FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);
CREATE POLICY "Providers can insert their own service rates"
  ON service_rates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Providers can update their own service rates"
  ON service_rates FOR UPDATE
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);
CREATE POLICY "Providers can delete their own service rates"
  ON service_rates FOR DELETE
  TO authenticated
  USING (auth.uid() = provider_id);
-- Create indexes for better performance
CREATE INDEX idx_service_rates_provider ON service_rates(provider_id);
CREATE INDEX idx_service_rates_category ON service_rates(service_category_id);
CREATE INDEX idx_service_rates_active ON service_rates(is_active);
-- Add updated_at trigger for service_rates
CREATE OR REPLACE FUNCTION update_service_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER service_rates_updated_at
  BEFORE UPDATE ON service_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_service_rates_updated_at();
