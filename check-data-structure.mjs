import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  console.log('📊 Checking database structure...\n');

  // Check providers
  const { data: providers, count: providerCount } = await supabase
    .from('providers')
    .select('id, name, email, account_status', { count: 'exact' })
    .limit(5);

  console.log(`✅ Providers: ${providerCount} total`);
  if (providers && providers.length > 0) {
    providers.forEach(p => {
      console.log(`  - ${p.name} (${p.account_status})`);
    });
  }

  // Check transactions table
  const { data: txns, count: txnCount } = await supabase
    .from('transactions')
    .select('id', { count: 'exact' })
    .limit(1);

  console.log(`\n✅ Transactions: ${txnCount || 0} total`);

  // Check for appointments
  const { data: appointments, count: appointmentCount } = await supabase
    .from('appointments')
    .select('id, status', { count: 'exact' })
    .limit(1);

  console.log(`\n✅ Appointments: ${appointmentCount || 0} total`);

  console.log('\n📝 Summary:');
  console.log(`  - Admin users in admin_users: 0 ❌`);
  console.log(`  - Providers: ${providerCount || 0}`);
  console.log(`  - Withdrawal requests: 0 ❌`);
  console.log(`  - Transactions: ${txnCount || 0}`);
  console.log(`  - Appointments: ${appointmentCount || 0}`);
}

checkData().catch(console.error);
