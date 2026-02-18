import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://spjqtdxnspndnnluayxp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function generateBankDetails() {
  const banks = [
    { name: 'First Bank', code: 'FB' },
    { name: 'GTBank', code: 'GT' },
    { name: 'Access Bank', code: 'AB' },
  ];
  const bank = banks[Math.floor(Math.random() * banks.length)];
  const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  return {
    method_type: 'bank_account',
    account_name: `Account ${accountNumber.slice(-4)}`,
    account_number: accountNumber,
    bank_code: bank.code,
    bank_name: bank.name,
    is_default: true,
    verified: true
  };
}

function generateMobileMoneyDetails() {
  const providers = ['MTN', 'Airtel', 'Glo'];
  const provider = providers[Math.floor(Math.random() * providers.length)];
  const phone = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
  return {
    method_type: 'mobile_money',
    account_name: `${provider} Account`,
    account_number: `+234${phone}`,
    bank_name: provider,
    is_default: true,
    verified: true
  };
}

async function insertViaRPC() {
  console.log('🌱 Creating test data via RPC...\n');

  try {
    // Get provider IDs
    const { data: providers, error: providerError } = await supabase
      .from('providers')
      .select('id, name')
      .limit(3);

    if (providerError || !providers) {
      console.log('❌ Error fetching providers:', providerError?.message);
      return;
    }

    console.log(`📍 Found ${providers.length} providers\n`);

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const methodDetails = i === 0 ? generateBankDetails() : generateMobileMoneyDetails();

      // Insert payment method
      const { data: method, error: methodError } = await supabase
        .from('provider_payout_methods')
        .insert([{
          provider_id: provider.id,
          ...methodDetails
        }])
        .select()
        .single();

      if (methodError) {
        console.log(`❌ Error creating method for ${provider.name}:`, methodError.message);
        continue;
      }

      // Insert withdrawal  
      const { data: withdrawal, error: withdrawalError } = await supabase
        .from('provider_withdrawals')
        .insert([{
          provider_id: provider.id,
          payout_method_id: method.id,
          amount: (i + 1) * 5000 + Math.random() * 2000,
          status: i === 0 ? 'Pending' : 'Paid',
          requested_at: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          processed_at: i === 0 ? null : new Date().toISOString(),
          admin_note: `Withdrawal for ${provider.name}`
        }])
        .select()
        .single();

      if (withdrawalError) {
        console.log(`❌ Error creating withdrawal for ${provider.name}:`, withdrawalError.message);
        continue;
      }

      console.log(`✅ ${provider.name}`);
      console.log(`   Method: ${method.method_type === 'bank_account' ? '🏦 Bank' : '📱 Mobile Money'}`);
      console.log(`   Account: ${method.account_number}`);
      console.log(`   Amount: ₦${withdrawal.amount.toFixed(2)}`);
      console.log(`   Status: ${withdrawal.status}\n`);
    }

    console.log('✅ All test data created successfully!');
    console.log('\n📌 Next: Create admin user and test the Financial > Payouts tab');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

insertViaRPC();
