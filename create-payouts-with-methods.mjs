import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://spjqtdxnspndnnluayxp.supabase.co';
// Use service role key to bypass RLS for data creation
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
    { name: 'UBA', code: 'UBA' }
  ];
  const bank = banks[Math.floor(Math.random() * banks.length)];
  const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  return {
    method_type: 'bank_account',
    account_name: `Business Account`,
    account_number: accountNumber,
    bank_code: bank.code,
    bank_name: bank.name,
    is_default: true,
    verified: true
  };
}

function generateMobileMoneyDetails() {
  const providers = ['MTN', 'Airtel', 'Glo', '9mobile'];
  const provider = providers[Math.floor(Math.random() * providers.length)];
  const phone = Math.floor(Math.random() * 9000000000 + 1000000000).toString();
  return {
    method_type: 'mobile_money',
    account_name: `${provider} Money`,
    account_number: `+234${phone}`,
    bank_name: provider,
    is_default: true,
    verified: true
  };
}

async function createTestDataWithPaymentMethods() {
  console.log('🌱 Creating test data with payment methods...\n');

  try {
    // Get the 3 providers
    const { data: providers } = await supabase
      .from('providers')
      .select('id, name')
      .limit(3);

    if (!providers || providers.length === 0) {
      console.log('❌ No providers found');
      return;
    }

    console.log(`📍 Found ${providers.length} providers`);

    // Create payment methods for each provider
    const paymentMethods = providers.map((provider, index) => ({
      provider_id: provider.id,
      ...(index === 0 ? generateBankDetails() : generateMobileMoneyDetails())
    }));

    const { data: createdMethods, error: methodError } = await supabase
      .from('provider_payout_methods')
      .insert(paymentMethods)
      .select();

    if (methodError) {
      console.log('❌ Error creating payment methods:', methodError.message);
      return;
    }

    console.log(`✅ Created ${createdMethods?.length || 0} payment methods`);
    
    // Create withdrawal requests with the payment methods
    const withdrawals = providers.map((provider, index) => {
      const method = createdMethods?.[index];
      return {
        provider_id: provider.id,
        amount: (index + 1) * 5000 + Math.random() * 2000,
        status: index === 0 ? 'Pending' : 'Paid',
        requested_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
        processed_at: index === 0 ? null : new Date(Date.now() - ((index - 1) * 12 * 60 * 60 * 1000)).toISOString(),
        payout_method_id: method?.id,
        admin_note: `Withdrawal request for ${provider.name}`
      };
    });

    const { data: createdWithdrawals, error: withdrawalError } = await supabase
      .from('provider_withdrawals')
      .insert(withdrawals)
      .select();

    if (withdrawalError) {
      console.log('❌ Error creating withdrawals:', withdrawalError.message);
      return;
    }

    console.log(`✅ Created ${createdWithdrawals?.length || 0} withdrawal requests\n`);

    console.log('📋 Summary:');
    providers.forEach((provider, i) => {
      const method = createdMethods?.[i];
      const withdrawal = createdWithdrawals?.[i];
      if (method && withdrawal) {
        console.log(`\n  Provider: ${provider.name}`);
        console.log(`    Payment Method: ${method.method_type === 'bank_account' ? 'Bank Account' : 'Mobile Money'}`);
        console.log(`    Account Name: ${method.account_name}`);
        console.log(`    Account Number: ${method.account_number}`);
        if (method.bank_name) console.log(`    Bank/Provider: ${method.bank_name}`);
        console.log(`    Amount: ₦${withdrawal.amount.toFixed(2)}`);
        console.log(`    Status: ${withdrawal.status}`);
      }
    });

    console.log('\n✅ Test data created successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Create an admin user in Supabase Auth');
    console.log('   2. Add their auth_id to the admin_users table with role "super_admin"');
    console.log('   3. Login and navigate to Financial > Payouts tab');
    console.log('   4. You should see the payment method details for each request');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestDataWithPaymentMethods();
