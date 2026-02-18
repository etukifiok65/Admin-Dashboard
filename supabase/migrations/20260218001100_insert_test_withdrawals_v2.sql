-- =====================================================
-- Insert Test Withdrawals (with RLS disabled)
-- Migration: 20260218001100_insert_test_withdrawals_v2.sql
-- Purpose: Insert test data for manual testing
-- =====================================================

-- Disable RLS temporarily
ALTER TABLE public.provider_withdrawals DISABLE ROW LEVEL SECURITY;

-- Insert test withdrawals with all 3 providers
WITH provider_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) as rn FROM public.providers
),
provider_methods AS (
  SELECT pm.id as method_id, pm.provider_id, ROW_NUMBER() OVER (PARTITION BY pm.provider_id ORDER BY pm.id) as rn
  FROM public.provider_payout_methods pm
)
INSERT INTO public.provider_withdrawals 
(id, provider_id, payout_method_id, amount, status, requested_at, processed_at, admin_note)
SELECT 
  gen_random_uuid(),
  pi.id,
  pm.method_id,
  CASE 
    WHEN pi.rn = 1 THEN 5500.00
    WHEN pi.rn = 2 THEN 6200.50
    ELSE 4750.25
  END,
  CASE 
    WHEN pi.rn = 2 THEN 'Paid'
    ELSE 'Pending'
  END,
  NOW() - INTERVAL '1 day' * pi.rn,
  CASE 
    WHEN pi.rn = 2 THEN NOW() - INTERVAL '12 hours'
    ELSE NULL
  END,
  'Test withdrawal request #' || pi.rn
FROM provider_ids pi
LEFT JOIN provider_methods pm ON pi.id = pm.provider_id AND pm.rn = 1
WHERE NOT EXISTS (SELECT 1 FROM public.provider_withdrawals LIMIT 1)
ORDER BY pi.rn;

-- Re-enable RLS
ALTER TABLE public.provider_withdrawals ENABLE ROW LEVEL SECURITY;

-- Now set up proper RLS policies
DROP POLICY IF EXISTS "allow_select_for_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "allow_insert_for_all" ON public.provider_withdrawals;
DROP POLICY IF EXISTS "allow_update_for_all" ON public.provider_withdrawals;

-- Permissive SELECT for testing (should be restricted later)
CREATE POLICY "test_allow_select_all" ON public.provider_withdrawals
  FOR SELECT
  USING (true);

-- Permissive INSERT for testing (should be restricted later)
CREATE POLICY "test_allow_insert_all" ON public.provider_withdrawals
  FOR INSERT
  WITH CHECK (true);

-- Permissive UPDATE for testing (should be restricted later)
CREATE POLICY "test_allow_update_all" ON public.provider_withdrawals
  FOR UPDATE
  USING (true);

-- DELETE policy for testing
CREATE POLICY "test_allow_delete_all" ON public.provider_withdrawals
  FOR DELETE
  USING (true);
