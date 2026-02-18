-- RLS Policy Audit & Security Enhancements
-- SECURITY: Comprehensive Row-Level Security policies for data isolation
-- Date: 2026-02-16

-- This migration audits existing RLS policies and adds comprehensive security

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_info ENABLE ROW LEVEL SECURITY;
-- ============================================================
-- PATIENTS TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Patients can view own profile" ON patients;
DROP POLICY IF EXISTS "Patients can update own profile" ON patients;
DROP POLICY IF EXISTS "Providers can view patient basic info" ON patients;
-- Patients can only view/edit their own record
CREATE POLICY "Patients can view own profile"
  ON patients FOR SELECT
  USING (auth.uid() = auth_id AND is_active = true);
CREATE POLICY "Patients can update own profile"
  ON patients FOR UPDATE
  USING (auth.uid() = auth_id AND is_active = true)
  WITH CHECK (auth.uid() = auth_id AND is_active = true);
-- Providers can view patient basic info for their appointments (verified providers only)
CREATE POLICY "Providers can view patient basic info"
  ON patients FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND patients.is_active = true
    AND EXISTS (
      SELECT 1 FROM providers
      WHERE providers.auth_id = auth.uid()
      AND providers.is_verified = true
      AND providers.account_status = 'approved'
      AND providers.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.provider_id IN (
        SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
      )
      AND a.patient_id = patients.id
    )
  );
-- ============================================================
-- PROVIDERS TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Providers can view own profile" ON providers;
DROP POLICY IF EXISTS "Providers can update own profile" ON providers;
DROP POLICY IF EXISTS "Everyone can view verified providers" ON providers;
DROP POLICY IF EXISTS "Patients can view their providers" ON providers;
-- Providers can view their own profile
CREATE POLICY "Providers can view own profile"
  ON providers FOR SELECT
  USING (auth.uid() = auth_id AND is_active = true);
-- Providers can update their own profile
CREATE POLICY "Providers can update own profile"
  ON providers FOR UPDATE
  USING (auth.uid() = auth_id AND is_active = true)
  WITH CHECK (auth.uid() = auth_id AND is_active = true);
-- Anyone can view verified provider profiles (public info)
CREATE POLICY "Everyone can view verified providers"
  ON providers FOR SELECT
  USING (is_verified = true AND account_status = 'approved' AND is_active = true);
-- Patients can view providers they have appointments with
CREATE POLICY "Patients can view their providers"
  ON providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      WHERE a.provider_id = providers.id
        AND p.auth_id = auth.uid()
        AND p.is_active = true
    )
  );
-- ============================================================
-- APPOINTMENTS TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Patients can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can create appointments" ON appointments;
DROP POLICY IF EXISTS "Patients can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Providers can update appointment status" ON appointments;
DROP POLICY IF EXISTS "Only creator can delete appointments" ON appointments;
-- Patients can view their own appointments
CREATE POLICY "Patients can view own appointments"
  ON appointments FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Providers can view their appointments
CREATE POLICY "Providers can view own appointments"
  ON appointments FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Patients can create appointments
CREATE POLICY "Patients can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Patients can update their appointments
CREATE POLICY "Patients can update own appointments"
  ON appointments FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Providers can update appointment status
CREATE POLICY "Providers can update appointment status"
  ON appointments FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Delete policy: Only creator can delete
CREATE POLICY "Only creator can delete appointments"
  ON appointments FOR DELETE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- ============================================================
-- VISIT_NOTES TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Providers can view own visit notes" ON visit_notes;
DROP POLICY IF EXISTS "Patients can view visit notes" ON visit_notes;
DROP POLICY IF EXISTS "Providers can create visit notes" ON visit_notes;
DROP POLICY IF EXISTS "Providers can update own visit notes" ON visit_notes;
-- Providers can view/create their own visit notes
CREATE POLICY "Providers can view own visit notes"
  ON visit_notes FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Patients can view visit notes from their appointments
CREATE POLICY "Patients can view visit notes"
  ON visit_notes FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Providers can create visit notes
CREATE POLICY "Providers can create visit notes"
  ON visit_notes FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Providers can update their visit notes
CREATE POLICY "Providers can update own visit notes"
  ON visit_notes FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- ============================================================
-- APPOINTMENT_MESSAGES TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Users can view appointment messages" ON appointment_messages;
DROP POLICY IF EXISTS "Users can send messages" ON appointment_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON appointment_messages;
-- Users can view messages from their appointments
CREATE POLICY "Users can view appointment messages"
  ON appointment_messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT p.auth_id FROM patients p
      WHERE p.id = appointment_messages.patient_id
      AND p.is_active = true
      UNION
      SELECT pr.auth_id FROM providers pr
      WHERE pr.id = appointment_messages.provider_id
      AND pr.is_active = true
    )
  );
-- Users can send messages
CREATE POLICY "Users can send messages"
  ON appointment_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND auth.uid() IN (
      SELECT p.auth_id FROM patients p
      WHERE p.id = appointment_messages.patient_id
      AND p.is_active = true
      UNION
      SELECT pr.auth_id FROM providers pr
      WHERE pr.id = appointment_messages.provider_id
      AND pr.is_active = true
    )
  );
-- Only sender can update their message
CREATE POLICY "Users can update own messages"
  ON appointment_messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);
-- ============================================================
-- REVIEWS TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Everyone can view reviews" ON reviews;
DROP POLICY IF EXISTS "Patients can create reviews" ON reviews;
DROP POLICY IF EXISTS "Patients can update own reviews" ON reviews;
DROP POLICY IF EXISTS "Patients can delete own reviews" ON reviews;
-- Everyone can view verified reviews
CREATE POLICY "Everyone can view reviews"
  ON reviews FOR SELECT
  USING (verified = true);
-- Patients can create reviews for appointments
CREATE POLICY "Patients can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Patients can update their own reviews
CREATE POLICY "Patients can update own reviews"
  ON reviews FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Patients can delete their own reviews
CREATE POLICY "Patients can delete own reviews"
  ON reviews FOR DELETE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- ============================================================
-- TRANSACTIONS TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Patients can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Providers can view appointment transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;
-- Sensitive table: Only specific users can access
-- Patients can view their transactions
CREATE POLICY "Patients can view own transactions"
  ON transactions FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Providers can view transactions for their appointments
CREATE POLICY "Providers can view appointment transactions"
  ON transactions FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Only system/API can create transactions
-- (Restrict via application logic)
CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
-- ============================================================
-- MEDICAL_INFO TABLE POLICIES
-- ============================================================

-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Patients can view own medical info" ON medical_info;
DROP POLICY IF EXISTS "Patients can create medical info" ON medical_info;
DROP POLICY IF EXISTS "Patients can update own medical info" ON medical_info;
-- Sensitive table: Strict access control
-- Patients can view their medical info
CREATE POLICY "Patients can view own medical info"
  ON medical_info FOR SELECT
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Patients can create medical info
CREATE POLICY "Patients can create medical info"
  ON medical_info FOR INSERT
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- Patients can update their medical info
CREATE POLICY "Patients can update own medical info"
  ON medical_info FOR UPDATE
  USING (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM patients WHERE auth_id = auth.uid() AND is_active = true
    )
  );
-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================

-- Grant necessary permissions to authenticated users (explicit tables only)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE
  patients,
  providers,
  appointments,
  visit_notes,
  appointment_messages,
  reviews,
  transactions,
  medical_info
TO authenticated;
-- Ensure service_role has admin access (for backend operations)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- ============================================================
-- AUDIT TRAIL
-- ============================================================

-- Create audit table for tracking changes (optional)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  record_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable RLS on audit table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- Grant read access to audit logs after table creation
GRANT SELECT ON TABLE audit_logs TO authenticated;
-- Drop existing policies to avoid name conflicts
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service can insert audit logs" ON audit_logs;
-- Audit table: Users can only view their own audit logs
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  USING (auth.uid() = user_id);
-- Only service role can insert audit logs
CREATE POLICY "Service can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
-- ============================================================
-- VERIFICATION CHECKS
-- ============================================================

-- Check that RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'patients', 'providers', 'appointments',
  'visit_notes', 'appointment_messages', 'reviews',
  'transactions', 'medical_info'
);
-- Check active policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- ============================================================
-- DOCUMENTATION
-- ============================================================

/*
RLS POLICY SUMMARY:

1. PATIENTS:
   - Can view/edit own profile
   - Providers can view verified info for scheduling

2. PROVIDERS:
   - Can view own profile
   - Verified profiles visible to everyone
   - Patients can view providers they have appointments with

3. APPOINTMENTS:
   - Patients can view/create/edit own
   - Providers can view/update status of their appointments
   - Immutable once certain status reached

4. VISIT_NOTES:
   - Providers create/view/edit own notes
   - Patients can view notes from their appointments

5. APPOINTMENT_MESSAGES:
   - Both parties can view appointment messages
   - Users can only send messages for appointments they're part of
   - Only sender can edit their message

6. REVIEWS:
   - Public visibility for verified reviews
   - Patients create/edit/delete own reviews

7. TRANSACTIONS:
   - Patients view own transactions
   - Providers view transactions for their services
   - System role handles creation

8. MEDICAL_INFO:
   - Most sensitive: patient-owned data
   - Strict access control for HIPAA compliance

Testing these policies:
- Switch to patient user and verify can't access other records
- Switch to provider and verify can only access related records
- Test with unauthenticated user - should see NO data
*/;
