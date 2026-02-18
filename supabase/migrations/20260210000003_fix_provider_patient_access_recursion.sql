-- Migration: Fix provider patient access RLS recursion
-- Created: 2026-02-10
-- Purpose: Avoid infinite recursion by using a security definer function

-- =====================================================
-- HELPER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.provider_has_patient_appointment(target_patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN providers p ON p.id = a.provider_id
    WHERE a.patient_id = target_patient_id
      AND p.auth_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.provider_has_patient_appointment(uuid) TO authenticated;
-- =====================================================
-- UPDATE POLICIES TO USE THE FUNCTION
-- =====================================================

DROP POLICY IF EXISTS "Providers can view patients for their appointments" ON patients;
CREATE POLICY "Providers can view patients for their appointments"
    ON patients FOR SELECT
    USING (public.provider_has_patient_appointment(id));
DROP POLICY IF EXISTS "Providers can view emergency contacts for their appointments" ON emergency_contacts;
CREATE POLICY "Providers can view emergency contacts for their appointments"
    ON emergency_contacts FOR SELECT
    USING (public.provider_has_patient_appointment(patient_id));
