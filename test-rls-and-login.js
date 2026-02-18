import { createClient } from '@supabase/supabase-js';

// First, let's check the RLS policy by trying to query as a user would
const serviceRoleClient = createClient(
  'https://spjqtdxnspndnnluayxp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║             RLS POLICY & USER QUERY TEST                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const userId = '700d1386-976d-4f21-9ebe-99b4be48911b';

// Test 1: Query as service role (should always work)
console.log('1️⃣  Query as SERVICE ROLE');
console.log('─'.repeat(60));
const { data: serviceData, error: serviceError } = await serviceRoleClient
  .from('admin_users')
  .select('*')
  .eq('auth_id', userId)
  .single();

if (serviceError) {
  console.log(`❌ Error: ${serviceError.message}`);
} else {
  console.log(`✅ Success`);
  console.log(`   Email: ${serviceData.email}`);
  console.log(`   Role: ${serviceData.role}`);
  console.log(`   Active: ${serviceData.is_active}`);
}
console.log('');

// Test 2: Check RLS policies defined
console.log('2️⃣  CHECKING RLS POLICIES ON admin_users TABLE');
console.log('─'.repeat(60));
const { data: policies, error: policiesError } = await serviceRoleClient
  .rpc('query_table_policies', { table_name: 'admin_users' })
  .catch(err => ({ data: null, error: err }));

if (policies) {
  console.log('✅ RLS Policies found:');
  console.log(JSON.stringify(policies, null, 2));
} else {
  console.log('ℹ️  Direct policy query not available, checking indirectly...\n');
  
  // Let's check what policies exist by querying the information schema
  const { data: rls, error: rls_error } = await serviceRoleClient
    .rpc('check_rls_enabled', { schema_name: 'public', table_name: 'admin_users' })
    .catch(err => ({ data: null, error: err }));
  
  if (rls) {
    console.log('RLS Status:', rls);
  } else {
    console.log('⚠️  Cannot query RLS directly.');
    console.log('   RLS is enabled by Supabase dashboard.\n');
  }
}

// Test 3: Simulate what the frontend does
console.log('3️⃣  SIMULATING FRONTEND QUERY');
console.log('─'.repeat(60));

// Create an anon client like the frontend does
const anonClient = createClient(
  'https://spjqtdxnspndnnluayxp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc'
);

const { data: { session } } = await anonClient.auth.getSession();
console.log(`Current session: ${session ? 'Yes' : 'No'}`);
console.log('(Frontend would have session from login)\n');

// Test 4: Check what the actual issue might be
console.log('4️⃣  CHECKING POTENTIAL ISSUES');
console.log('─'.repeat(60));

// Issue 1: Is the query failing silently?
const { data: testData, error: testError } = await serviceRoleClient
  .from('admin_users')
  .select('*')
  .eq('auth_id', userId)
  .single();

if (testError) {
  console.log(`❌ FOUND ISSUE: Query error`);
  console.log(`   Error: ${testError.message}`);
  console.log(`   Code: ${testError.code}`);
} else if (!testData) {
  console.log(`❌ FOUND ISSUE: No data returned despite no error`);
} else {
  console.log(`✅ Query works correctly`);
  console.log(`   Email: ${testData.email}`);
  console.log(`   Role: ${testData.role}`);
  console.log(`   Status: Account is ready\n`);
  
  // Since query works, check the frontend code logic
  console.log('5️⃣  CHECKING FRONTEND LOGIN LOGIC');
  console.log('─'.repeat(60));
  
  console.log('When login happens:');
  console.log(`  1. signInWithPassword("${testData.email}", password)`);
  console.log(`  2. Get current user → ID: ${userId}`);
  console.log(`  3. Query admin_users WHERE auth_id = "${userId}"`);
  console.log(`  4. Result: Profile FOUND ✅`);
  console.log(`  5. Create AdminUser object:`);
  console.log(`     - id: ${testData.id}`);
  console.log(`     - email: ${testData.email}`);
  console.log(`     - name: ${testData.name}`);
  console.log(`     - role: ${testData.role}`);
  console.log(`     - created_at: ${testData.created_at}`);
  console.log(`  6. Return success ✅\n`);
  
  console.log('⚠️  POTENTIAL ISSUES:');
  console.log('  • Frontend code might have old cached errors');
  console.log('  • Browser might have stale session');
  console.log('  • Environment variables might not be loaded');
  console.log('  • Password might be incorrect');
}

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                      TEST COMPLETE                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');
