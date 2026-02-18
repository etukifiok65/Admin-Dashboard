-- =====================================================
-- Temporarily Disable RLS for Data Insertion
-- =====================================================

-- Disable RLS on provider_withdrawals temporarily
ALTER TABLE public.provider_withdrawals DISABLE ROW LEVEL SECURITY;

-- Now data can be inserted without RLS restrictions
