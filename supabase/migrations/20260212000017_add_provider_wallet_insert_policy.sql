-- =====================================================
-- Add Provider Wallet INSERT Policy
-- =====================================================
-- Allows providers to create their own wallet during signup.

DROP POLICY IF EXISTS "Providers can insert their own wallet" ON public.provider_wallets;
CREATE POLICY "Providers can insert their own wallet"
  ON public.provider_wallets
  FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = TRUE
    )
  );
