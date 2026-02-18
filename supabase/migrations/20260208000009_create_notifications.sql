-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'appointment', 'payment', 'reminder', 'system', 'promotion'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data for the notification (e.g., appointment_id, payment_id)
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Create index for faster queries
CREATE INDEX idx_notifications_patient_id ON public.notifications(patient_id);
CREATE INDEX idx_notifications_provider_id ON public.notifications(provider_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- RLS Policies for notifications
-- Patients can view their own notifications
CREATE POLICY "Patients can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (patient_id = auth.uid());
-- Providers can view their own notifications
CREATE POLICY "Providers can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (provider_id = auth.uid());
-- Patients can update their own notifications (mark as read)
CREATE POLICY "Patients can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (patient_id = auth.uid());
-- Providers can update their own notifications (mark as read)
CREATE POLICY "Providers can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (provider_id = auth.uid());
-- System/Authenticated users can insert notifications
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
-- Patients can delete their own notifications
CREATE POLICY "Patients can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (patient_id = auth.uid());
-- Providers can delete their own notifications
CREATE POLICY "Providers can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (provider_id = auth.uid());
-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();
