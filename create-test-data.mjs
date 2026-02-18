import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://spjqtdxnspndnnluayxp.supabase.co';
// Use service role key to bypass RLS for data creation
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestData() {
  console.log('🌱 Creating test data...\n');

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

  // Create sample withdrawal requests
  const withdrawals = providers.map((provider, index) => ({
    provider_id: provider.id,
    amount: (index + 1) * 5000 + Math.random() * 1000,
    status: index === 0 ? 'Pending' : 'Paid',
    requested_at: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toISOString(),
    processed_at: index === 0 ? null : new Date().toISOString(),
    admin_note: `Test withdrawal for ${provider.name}`
  }));

  const { data: createdWithdrawals, error: withdrawalError } = await supabase
    .from('provider_withdrawals')
    .insert(withdrawals)
    .select();

  if (withdrawalError) {
    console.log('❌ Error creating withdrawals:', withdrawalError.message);
  } else {
    console.log(`✅ Created ${createdWithdrawals?.length || 0} withdrawal requests`);
    createdWithdrawals?.forEach((w, i) => {
      console.log(`  ${i+1}. Amount: $${parseFloat(w.amount).toFixed(2)}, Status: ${w.status}`);
    });
  }

  // Note: Admin users need to be created through Supabase Auth first
  console.log('\n⚠️  Note: Admin users must be created through Supabase Auth');
  console.log('   Then add their auth_id to the admin_users table');
}

createTestData().catch(console.error);
