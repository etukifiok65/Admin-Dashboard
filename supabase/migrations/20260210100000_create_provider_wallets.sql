-- Create provider_wallets table
CREATE TABLE IF NOT EXISTS public.provider_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_provider_wallets_provider_id ON public.provider_wallets(provider_id);
-- Enable RLS
ALTER TABLE public.provider_wallets ENABLE ROW LEVEL SECURITY;
-- Providers can view and update their own wallet
CREATE POLICY "Providers can view their own wallet"
  ON public.provider_wallets
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
CREATE POLICY "Providers can update their own wallet"
  ON public.provider_wallets
  FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_provider_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER provider_wallets_updated_at
  BEFORE UPDATE ON public.provider_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_wallets_updated_at();
