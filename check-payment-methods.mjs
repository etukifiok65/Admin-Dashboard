import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

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
