-- =====================================================
-- Visit Notes and Appointment Messages
-- Migration: 20260212000100
-- =====================================================

-- Visit notes (provider-authored)
CREATE TABLE IF NOT EXISTS visit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE NOT NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    note_text TEXT NOT NULL,
    provider_signature TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
DROP TRIGGER IF EXISTS update_visit_notes_updated_at ON visit_notes;
CREATE TRIGGER update_visit_notes_updated_at BEFORE UPDATE ON visit_notes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Appointment chat messages
CREATE TABLE IF NOT EXISTS appointment_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID NOT NULL,
    sender_role TEXT NOT NULL CHECK (sender_role IN ('patient', 'provider')),
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS appointment_messages_appointment_id_idx
    ON appointment_messages (appointment_id, created_at);
-- Enable RLS
ALTER TABLE visit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_messages ENABLE ROW LEVEL SECURITY;
-- Visit notes policies
DROP POLICY IF EXISTS "Providers can view visit notes" ON visit_notes;
DROP POLICY IF EXISTS "Providers can insert visit notes" ON visit_notes;
DROP POLICY IF EXISTS "Providers can update visit notes" ON visit_notes;
DROP POLICY IF EXISTS "Patients can view visit notes after completion" ON visit_notes;
CREATE POLICY "Providers can view visit notes"
    ON visit_notes FOR SELECT
    USING (
        provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        )
    );
CREATE POLICY "Providers can insert visit notes"
    ON visit_notes FOR INSERT
    WITH CHECK (
        provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM appointments
            WHERE id = appointment_id
              AND provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
              AND patient_id = visit_notes.patient_id
        )
    );
CREATE POLICY "Providers can update visit notes"
    ON visit_notes FOR UPDATE
    USING (
        provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        )
    )
    WITH CHECK (
        provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        )
    );
CREATE POLICY "Patients can view visit notes after completion"
    ON visit_notes FOR SELECT
    USING (
        patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid())
              AND status = 'Completed'
        )
    );
-- Appointment message policies
DROP POLICY IF EXISTS "Providers can view appointment messages" ON appointment_messages;
DROP POLICY IF EXISTS "Patients can view appointment messages" ON appointment_messages;
DROP POLICY IF EXISTS "Providers can insert appointment messages" ON appointment_messages;
DROP POLICY IF EXISTS "Patients can insert appointment messages" ON appointment_messages;
CREATE POLICY "Providers can view appointment messages"
    ON appointment_messages FOR SELECT
    USING (
        provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        )
    );
CREATE POLICY "Patients can view appointment messages"
    ON appointment_messages FOR SELECT
    USING (
        patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid())
        )
    );
CREATE POLICY "Providers can insert appointment messages"
    ON appointment_messages FOR INSERT
    WITH CHECK (
        sender_role = 'provider'
        AND sender_id = auth.uid()
        AND provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid())
        )
    );
CREATE POLICY "Patients can insert appointment messages"
    ON appointment_messages FOR INSERT
    WITH CHECK (
        sender_role = 'patient'
        AND sender_id = auth.uid()
        AND patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid())
        AND appointment_id IN (
            SELECT id FROM appointments
            WHERE patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid())
        )
    );
