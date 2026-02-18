import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://spjqtdxnspndnnluayxp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPaymentMethodsStructure() {
  console.log('🏦 Checking provider payout methods structure...\n');

  // Check provider_payout_methods table
  const { data: methods, count, error } = await supabase
    .from('provider_payout_methods')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.log('❌ Error fetching payout methods:', error.message);
    return;
  }

  console.log(`✅ Provider payout methods: ${count} total`);
  if (methods && methods.length > 0) {
    console.log('\nColumn structure:');
    const firstMethod = methods[0];
    Object.keys(firstMethod).forEach(key => {
      console.log(`  - ${key}: ${typeof firstMethod[key]}`);
    });
    
    console.log('\nSample records:');
    methods.forEach((m, i) => {
      console.log(`  ${i+1}. ${JSON.stringify(m)}`);
    });
  } else {
    console.log('⚠️  No payout methods found in database');
  }

  // Check withdrawals table structure again with payout method relationship
  const { data: withdrawals } = await supabase
    .from('provider_withdrawals')
    .select(`
      id,
      amount,
      status,
      payout_method_id,
      provider_payout_methods (
        id,
        method_type,
        account_details,
        provider_id
      )
    `)
    .limit(1);

  console.log('\n📋 Withdrawal with payment method structure:');
  if (withdrawals && withdrawals.length > 0) {
    console.log(JSON.stringify(withdrawals[0], null, 2));
  } else {
    console.log('  (No withdrawals with payment methods to display)');
  }
}

checkPaymentMethodsStructure().catch(console.error);
