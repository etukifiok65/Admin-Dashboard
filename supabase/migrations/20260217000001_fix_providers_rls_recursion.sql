-- Migration: Fix providers RLS recursion by using security definer helpers
-- Date: 2026-02-17
-- Purpose: Avoid infinite recursion across providers/patients/appointments policies

-- =====================================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_provider_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM providers
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.current_patient_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM patients
  WHERE auth_id = auth.uid()
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.current_provider_is_verified()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM providers
    WHERE auth_id = auth.uid()
      AND is_active = true
      AND is_verified = true
      AND account_status = 'approved'
  );
$$;
CREATE OR REPLACE FUNCTION public.patient_has_provider_appointment(target_provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE a.provider_id = target_provider_id
      AND p.auth_id = auth.uid()
      AND p.is_active = true
  );
$$;
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
GRANT EXECUTE ON FUNCTION public.current_provider_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_patient_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_provider_is_verified() TO authenticated;
GRANT EXECUTE ON FUNCTION public.patient_has_provider_appointment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.provider_has_patient_appointment(uuid) TO authenticated;
-- =====================================================
-- UPDATE POLICIES TO USE HELPERS
-- =====================================================

-- Providers: Patients can view their providers without recursive policies
DROP POLICY IF EXISTS "Patients can view their providers" ON providers;
CREATE POLICY "Patients can view their providers"
  ON providers FOR SELECT
  USING (public.patient_has_provider_appointment(providers.id));
-- Patients: Providers can view patient basic info without recursive policies
DROP POLICY IF EXISTS "Providers can view patient basic info" ON patients;
CREATE POLICY "Providers can view patient basic info"
  ON patients FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND patients.is_active = true
    AND public.current_provider_is_verified()
    AND public.provider_has_patient_appointment(patients.id)
  );
