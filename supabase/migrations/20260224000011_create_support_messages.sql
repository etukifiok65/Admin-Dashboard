-- Create support_messages table for website enquiry/contact form messages
-- This is separate from appointment_messages which is for patient-provider chat

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Sender information
  sender_name VARCHAR(255) NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  sender_phone VARCHAR(50),
  
  -- Message details
  subject VARCHAR(500) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'appointment', 'complaint', 'feedback')),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Status tracking
  status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'responded', 'resolved', 'closed')),
  
  -- Admin response
  admin_response TEXT,
  responded_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  
  -- Metadata
  user_agent TEXT,
  ip_address INET,
  source VARCHAR(50) DEFAULT 'website_form',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_support_messages_status ON public.support_messages(status);
CREATE INDEX idx_support_messages_category ON public.support_messages(category);
CREATE INDEX idx_support_messages_priority ON public.support_messages(priority);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);
CREATE INDEX idx_support_messages_email ON public.support_messages(sender_email);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admins can view all support messages
CREATE POLICY "admin_can_read_support_messages"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
        AND admin_users.is_active = TRUE
    )
  );

-- Admins can update support messages (respond, change status, priority, category)
CREATE POLICY "admin_can_update_support_messages"
  ON public.support_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.auth_id = auth.uid()
        AND admin_users.is_active = TRUE
    )
  );

-- System/API can insert support messages (from website contact form)
-- Note: This allows unauthenticated inserts for public contact form
CREATE POLICY "public_can_insert_support_messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (true);

-- Create trigger for updated_at timestamp
CREATE TRIGGER update_support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
