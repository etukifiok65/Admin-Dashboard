-- Create provider_transaction_logs table for audit trail
DROP TABLE IF EXISTS public.provider_transaction_logs CASCADE;
CREATE TABLE public.provider_transaction_logs (
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
-- Create index for provider lookups
CREATE INDEX idx_provider_transaction_logs_provider_id ON public.provider_transaction_logs(provider_id);
-- Create index for date range queries
CREATE INDEX idx_provider_transaction_logs_created_at ON public.provider_transaction_logs(created_at);
-- Create index for filtering by appointment
CREATE INDEX idx_provider_transaction_logs_appointment_id ON public.provider_transaction_logs(related_appointment_id);
-- Enable RLS
ALTER TABLE public.provider_transaction_logs ENABLE ROW LEVEL SECURITY;
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
