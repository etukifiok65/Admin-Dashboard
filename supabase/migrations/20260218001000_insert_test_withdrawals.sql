-- =====================================================
-- Create Test Data for Provider Withdrawals
-- Run this in the Supabase SQL Editor to create test withdrawal requests
-- =====================================================

-- Get the first provider ID
WITH first_provider AS (
  SELECT id FROM public.providers ORDER BY name LIMIT 1
),
first_method AS (
  SELECT id FROM public.provider_payout_methods 
  WHERE provider_id = (SELECT id FROM first_provider)
  LIMIT 1
)
INSERT INTO public.provider_withdrawals 
(provider_id, payout_method_id, amount, status, requested_at, admin_note)
SELECT 
  (SELECT id FROM first_provider),
  (SELECT id FROM first_method),
  5500.00,
  'Pending',
  NOW() - INTERVAL '1 day',
  'Test withdrawal - 1'
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_withdrawals 
  WHERE status = 'Pending' 
  LIMIT 1
);

-- Get second provider and method
WITH second_provider AS (
  SELECT id FROM public.providers ORDER BY name LIMIT 1 OFFSET 1
),
second_method AS (
  SELECT id FROM public.provider_payout_methods 
  WHERE provider_id = (SELECT id FROM second_provider)
  LIMIT 1
)
INSERT INTO public.provider_withdrawals 
(provider_id, payout_method_id, amount, status, requested_at, processed_at, admin_note)
SELECT 
  (SELECT id FROM second_provider),
  (SELECT id FROM second_method),
  6200.50,
  'Paid',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '12 hours',
  'Test withdrawal - 2 (Completed)'
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_withdrawals 
  WHERE status = 'Paid'
  LIMIT 1
);

-- Get third provider and method
WITH third_provider AS (
  SELECT id FROM public.providers ORDER BY name LIMIT 1 OFFSET 2
),
third_method AS (
  SELECT id FROM public.provider_payout_methods 
  WHERE provider_id = (SELECT id FROM third_provider)
  LIMIT 1
)
INSERT INTO public.provider_withdrawals 
(provider_id, payout_method_id, amount, status, requested_at, admin_note)
SELECT 
  (SELECT id FROM third_provider),
  (SELECT id FROM third_method),
  4750.25,
  'Pending',
  NOW() - INTERVAL '3 days',
  'Test withdrawal - 3'
WHERE NOT EXISTS (
  SELECT 1 FROM public.provider_withdrawals 
  WHERE status = 'Pending'
  AND requested_at < NOW() - INTERVAL '2 days'
  LIMIT 1
);
