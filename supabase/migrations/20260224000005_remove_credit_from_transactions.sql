-- Revert 'credit' from transactions table - credit type is only for provider_transaction_logs

-- Delete any existing credit transactions (these should now be in provider_transaction_logs)
DELETE FROM transactions WHERE type = 'credit';

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('topup', 'payment', 'refund'));
