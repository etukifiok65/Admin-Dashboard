-- =====================================================
-- Create Broadcast Notifications Table for Admin Use
-- Migration: 20260218002000_create_broadcast_notifications.sql
-- Purpose: Allow admins to send notifications to all patients/providers
-- =====================================================

CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  recipient_type VARCHAR(20) NOT NULL, -- 'patients', 'providers', 'both'
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sent'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Track delivery stats
  total_recipients INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  read_count INT DEFAULT 0
);

-- Create indexes for faster queries
CREATE INDEX idx_broadcast_notifications_status ON public.broadcast_notifications(status);
CREATE INDEX idx_broadcast_notifications_created_at ON public.broadcast_notifications(created_at DESC);
CREATE INDEX idx_broadcast_notifications_scheduled_at ON public.broadcast_notifications(scheduled_at);

-- Enable RLS
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins can view
CREATE POLICY "admins_can_view_broadcast_notifications" ON public.broadcast_notifications
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create
CREATE POLICY "admins_can_create_broadcast_notifications" ON public.broadcast_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only creators can update their own
CREATE POLICY "admins_can_update_broadcast_notifications" ON public.broadcast_notifications
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_broadcast_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER broadcast_notifications_updated_at
  BEFORE UPDATE ON public.broadcast_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_broadcast_notifications_updated_at();

-- =====================================================
-- Create Broadcast Notification Recipients Table
-- Tracks which patients/providers received which notifications
-- =====================================================

CREATE TABLE IF NOT EXISTS public.broadcast_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_notification_id UUID NOT NULL REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT one_recipient_per_notification CHECK (
    (patient_id IS NOT NULL AND provider_id IS NULL) OR
    (patient_id IS NULL AND provider_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_broadcast_notification_recipients_notification_id ON public.broadcast_notification_recipients(broadcast_notification_id);
CREATE INDEX idx_broadcast_notification_recipients_patient_id ON public.broadcast_notification_recipients(patient_id);
CREATE INDEX idx_broadcast_notification_recipients_provider_id ON public.broadcast_notification_recipients(provider_id);

-- Enable RLS
ALTER TABLE public.broadcast_notification_recipients ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own received notifications
CREATE POLICY "users_can_view_their_notifications" ON public.broadcast_notification_recipients
  FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid() OR 
    provider_id = auth.uid()
  );

-- Allow authenticated users to mark as read
CREATE POLICY "users_can_mark_as_read" ON public.broadcast_notification_recipients
  FOR UPDATE
  TO authenticated
  USING (
    patient_id = auth.uid() OR 
    provider_id = auth.uid()
  )
  WITH CHECK (
    patient_id = auth.uid() OR 
    provider_id = auth.uid()
  );
