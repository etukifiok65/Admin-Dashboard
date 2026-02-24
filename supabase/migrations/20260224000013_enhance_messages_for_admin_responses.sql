-- =====================================================
-- Enhance Messages Table for Admin Responses
-- Migration: 20260224000013
-- =====================================================

-- Add admin response tracking columns
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'appointment', 'complaint', 'feedback')),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'responded', 'resolved', 'closed')),
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS responded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at 
BEFORE UPDATE ON public.messages
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_category ON public.messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON public.messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_email ON public.messages(email);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Admin users can read all messages
DROP POLICY IF EXISTS "admin_can_read_messages" ON public.messages;
CREATE POLICY "admin_can_read_messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_id = auth.uid()
      AND is_active = true
    )
  );

-- Admin users can update messages (for responses)
DROP POLICY IF EXISTS "admin_can_update_messages" ON public.messages;
CREATE POLICY "admin_can_update_messages"
  ON public.messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_id = auth.uid()
      AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_id = auth.uid()
      AND is_active = true
    )
  );

-- Public can insert messages (for website contact form)
DROP POLICY IF EXISTS "public_can_insert_messages" ON public.messages;
CREATE POLICY "public_can_insert_messages"
  ON public.messages FOR INSERT
  WITH CHECK (true);
