-- =====================================================
-- Insert Test Withdrawal Requests with Payment Methods
-- Run this in Supabase SQL Editor to test the Financial Page
-- =====================================================

-- Step 1: Get provider IDs
-- (Verify these exist first)
SELECT id, name FROM providers LIMIT 3;

-- Step 2: Create payment methods (run after confirming provider IDs)
WITH provider_ids AS (
  SELECT id FROM providers LIMIT 3
)
INSERT INTO public.provider_payout_methods 
(provider_id, method_type, account_name, account_number, bank_code, bank_name, is_default, verified)
SELECT 
  id,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'bank_account'
    ELSE 'mobile_money'
  END,
  'Test Account - ' || SUBSTR(id::text, 1, 8),
  LPAD((RANDOM()*9000000000+1000000000)::bigint::text, 10, '0'),
  CASE WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'FB' ELSE NULL END,
  CASE 
    WHEN ROW_NUMBER() OVER (ORDER BY id) = 1 THEN 'First Bank'
    WHEN ROW_NUMBER() OVER (ORDER BY id) = 2 THEN 'MTN Mobile'
    ELSE 'Airtel Mobile'
  END,
  true,
  true
FROM provider_ids
ON CONFLICT DO NOTHING;

-- Step 3: Create withdrawal requests
WITH provider_data AS (
  SELECT p.id as provider_id, pm.id as method_id
  FROM providers p
  LEFT JOIN provider_payout_methods pm ON p.id = pm.provider_id
  LIMIT 3
)
INSERT INTO public.provider_withdrawals
(provider_id, payout_method_id, amount, status, requested_at, admin_note)
SELECT 
  provider_id,
  method_id,
  5000 + (RANDOM() * 2000)::numeric(10,2),
  'Pending',
  NOW() - INTERVAL '1 day',
  'Test withdrawal request'
FROM provider_data
ON CONFLICT DO NOTHING;

-- Step 4: Verify the data
SELECT 
  pw.id,
  p.name as provider_name,
  pw.amount,
  pw.status,
  ppm.method_type,
  ppm.account_number
FROM provider_withdrawals pw
JOIN providers p ON pw.provider_id = p.id
LEFT JOIN provider_payout_methods ppm ON pw.payout_method_id = ppm.id
ORDER BY pw.requested_at DESC;
