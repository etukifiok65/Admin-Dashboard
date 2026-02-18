import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://spjqtdxnspndnnluayxp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testWithdrawals() {
  console.log('🔍 Checking provider_withdrawals data...\n');

  //1. Check if there's any withdrawal data
  const { data: allWithdrawals, error: allError, count } = await supabase
    .from('provider_withdrawals')
    .select('id, provider_id, amount, status, requested_at, processed_at', { count: 'exact' })
    .limit(5);

  if (allError) {
    console.log('❌ Error fetching withdrawals:', allError.message);
    console.log('Error code:', allError.code);
    console.log('Full error:', JSON.stringify(allError, null, 2));
  } else {
    console.log('✅ Successfully fetched withdrawals');
    console.log(`Total count: ${count}`);
    if (allWithdrawals && allWithdrawals.length > 0) {
      console.log('Sample data:', JSON.stringify(allWithdrawals[0], null, 2));
    } else {
      console.log('⚠️  No withdrawal data found');
    }
  }

  // 2. Check admin_users table (without RLS restrictions)
  const { data: adminUsers, error: adminError } = await supabase
    .from('admin_users')
    .select('id, auth_id, email, role, is_active')
    .limit(5);

  if (adminError) {
    console.log('\n❌ Error fetching admin users:', adminError.message);
  } else {
    console.log('\n✅ Admin users found:');
    if (adminUsers && adminUsers.length > 0) {
      console.log(`Count: ${adminUsers.length}`);
      adminUsers.forEach((user, i) => {
        console.log(`  ${i+1}. Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
      });
    } else {
      console.log('⚠️  No admin users found');
    }
  }
}

testWithdrawals().catch(console.error);
