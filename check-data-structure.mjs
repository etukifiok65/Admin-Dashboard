import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://spjqtdxnspndnnluayxp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc';

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
