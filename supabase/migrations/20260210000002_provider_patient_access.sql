-- Migration: Add RLS policies for providers to access patient data
-- Created: 2026-02-10
-- Purpose: Allow providers to read patient information and emergency contacts for their appointments

-- =====================================================
-- PROVIDERS CAN VIEW PATIENT DATA FOR THEIR APPOINTMENTS
-- =====================================================

-- Allow providers to read patient profiles for appointments assigned to them
DROP POLICY IF EXISTS "Providers can view patients for their appointments" ON patients;
CREATE POLICY "Providers can view patients for their appointments"
    ON patients FOR SELECT
    USING (
        id IN (
            SELECT patient_id 
            FROM appointments 
            WHERE provider_id IN (
                SELECT id FROM providers WHERE auth_id = auth.uid()
            )
        )
    );
-- =====================================================
-- PROVIDERS CAN VIEW EMERGENCY CONTACTS FOR THEIR APPOINTMENTS
-- =====================================================

-- Allow providers to read emergency contacts for patients with their appointments
DROP POLICY IF EXISTS "Providers can view emergency contacts for their appointments" ON emergency_contacts;
CREATE POLICY "Providers can view emergency contacts for their appointments"
    ON emergency_contacts FOR SELECT
    USING (
        patient_id IN (
            SELECT patient_id 
            FROM appointments 
            WHERE provider_id IN (
                SELECT id FROM providers WHERE auth_id = auth.uid()
            )
        )
    );
