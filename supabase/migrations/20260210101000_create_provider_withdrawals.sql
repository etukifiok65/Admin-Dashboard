-- Create provider_withdrawals table
CREATE TABLE IF NOT EXISTS public.provider_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending, Paid
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  payout_method_id UUID REFERENCES public.provider_payout_methods(id),
  admin_note TEXT
);
CREATE INDEX idx_provider_withdrawals_provider_id ON public.provider_withdrawals(provider_id);
CREATE INDEX idx_provider_withdrawals_status ON public.provider_withdrawals(status);
-- Enable RLS
ALTER TABLE public.provider_withdrawals ENABLE ROW LEVEL SECURITY;
-- Providers can view their own withdrawals
CREATE POLICY "Providers can view their own withdrawals"
  ON public.provider_withdrawals
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
-- Providers can insert withdrawal requests
CREATE POLICY "Providers can insert their own withdrawals"
  ON public.provider_withdrawals
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
-- Admins can update status (requires admin role)
CREATE POLICY "Admins can update withdrawal status"
  ON public.provider_withdrawals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM providers 
      WHERE auth_id = auth.uid() AND account_status = 'admin'
    )
  );
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_provider_withdrawals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER provider_withdrawals_updated_at
  BEFORE UPDATE ON public.provider_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_withdrawals_updated_at();
