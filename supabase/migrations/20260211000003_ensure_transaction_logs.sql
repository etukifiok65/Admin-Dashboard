-- Direct creation of provider_transaction_logs with proper handling
-- This ensures the table is created even if previous migrations had issues

BEGIN;
-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.provider_transaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'refund')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  platform_fee_amount NUMERIC(12,2) DEFAULT 0,
  related_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  related_withdrawal_id UUID REFERENCES public.provider_withdrawals(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_provider_transaction_logs_provider_id ON public.provider_transaction_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_transaction_logs_created_at ON public.provider_transaction_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_provider_transaction_logs_appointment_id ON public.provider_transaction_logs(related_appointment_id);
-- Enable RLS if not already enabled
ALTER TABLE public.provider_transaction_logs ENABLE ROW LEVEL SECURITY;
-- Drop and recreate policies to ensure they exist
DROP POLICY IF EXISTS "Providers can view their own transaction logs" ON public.provider_transaction_logs;
DROP POLICY IF EXISTS "System can insert transaction logs" ON public.provider_transaction_logs;
DROP POLICY IF EXISTS "Admins can view all transaction logs" ON public.provider_transaction_logs;
-- Providers can view their own transaction logs
CREATE POLICY "Providers can view their own transaction logs"
  ON public.provider_transaction_logs
  FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid()
    )
  );
-- System (services) can insert transaction logs
CREATE POLICY "System can insert transaction logs"
  ON public.provider_transaction_logs
  FOR INSERT
  WITH CHECK (true);
-- Admins can view all transaction logs
CREATE POLICY "Admins can view all transaction logs"
  ON public.provider_transaction_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM providers 
      WHERE auth_id = auth.uid() AND account_status = 'admin'
    )
  );
COMMIT;
