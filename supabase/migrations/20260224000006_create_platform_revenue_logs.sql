-- Create platform_revenue_logs table to track all platform fees

CREATE TABLE IF NOT EXISTS public.platform_revenue_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_type VARCHAR(50) NOT NULL CHECK (revenue_type IN ('appointment_commission', 'cancellation_fee')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  related_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_platform_revenue_logs_type ON public.platform_revenue_logs(revenue_type);
CREATE INDEX idx_platform_revenue_logs_created_at ON public.platform_revenue_logs(created_at);
CREATE INDEX idx_platform_revenue_logs_appointment_id ON public.platform_revenue_logs(related_appointment_id);

-- Enable RLS
ALTER TABLE public.platform_revenue_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all platform revenue logs
CREATE POLICY "Admins can view all platform revenue logs"
  ON public.platform_revenue_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE auth_id = auth.uid()
        AND is_active = true
        AND role IN ('super_admin', 'admin', 'moderator')
    )
  );

-- System (Security Definer functions) can insert platform revenue logs
CREATE POLICY "System can insert platform revenue logs"
  ON public.platform_revenue_logs
  FOR INSERT
  WITH CHECK (true);
