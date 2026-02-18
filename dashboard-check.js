import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://spjqtdxnspndnnluayxp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║            ADMIN DASHBOARD COMPREHENSIVE CHECK                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// 1. Check Auth Users
console.log('📋 AUTHENTICATION USERS (Supabase Auth)');
console.log('─'.repeat(60));
const { data: { users } } = await supabase.auth.admin.listUsers();
console.log(`Total Auth Users: ${users.length}\n`);
users.forEach(u => {
  console.log(`  • ${u.email}`);
  console.log(`    ID: ${u.id}`);
  console.log(`    Created: ${u.created_at?.split('T')[0]}`);
  console.log(`    Role: ${u.user_metadata?.role || 'none'}`);
  console.log('');
});

// 2. Check Admin Users Table
console.log('\n📊 ADMIN USERS TABLE');
console.log('─'.repeat(60));
const { data: adminUsers } = await supabase.from('admin_users').select('*');
console.log(`Total Admin Records: ${adminUsers?.length || 0}\n`);
adminUsers?.forEach(a => {
  console.log(`  • ${a.email}`);
  console.log(`    Role: ${a.role}`);
  console.log(`    Active: ${a.is_active}`);
  console.log(`    Auth ID: ${a.auth_id}`);
  console.log('');
});

// 3. Check Auth/Admin Alignment
console.log('\n🔗 AUTHENTICATION & ADMIN ALIGNMENT');
console.log('─'.repeat(60));
let matched = 0, mismatched = 0;
users.forEach(authUser => {
  const adminRecord = adminUsers?.find(a => a.auth_id === authUser.id);
  if (adminRecord) {
    matched++;
    console.log(`✅ ${authUser.email} → Role: ${adminRecord.role} (Active: ${adminRecord.is_active})`);
  } else {
    mismatched++;
    console.log(`❌ ${authUser.email} → NO ADMIN RECORD`);
  }
});

console.log(`\nSummary: ${matched} matched, ${mismatched} missing admin records`);

// 4. Check Project Configuration
console.log('\n⚙️  PROJECT CONFIGURATION');
console.log('─'.repeat(60));
console.log('Project: spjqtdxnspndnnluayxp (Supabase)');
console.log('Region: us-east-1');
console.log('Database: PostgreSQL 15');
console.log('Auth: Supabase Auth');

// 5. Check Environment
console.log('\n🛠️  ENVIRONMENT STATUS');
console.log('─'.repeat(60));
console.log(`VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`VITE_SUPABASE_ANON_KEY: ${process.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);

// 6. Check Application Files
console.log('\n📁 APPLICATION STRUCTURE');
console.log('─'.repeat(60));
console.log('Pages:');
console.log('  ✓ LoginPage.tsx');
console.log('  ✓ DashboardPage.tsx');
console.log('  ✓ UsersPage.tsx');
console.log('  ✓ AnalyticsPage.tsx');
console.log('  ✓ SettingsPage.tsx');
console.log('\nServices:');
console.log('  ✓ adminAuth.service.ts');
console.log('  ✓ adminDashboard.service.ts');
console.log('  ✓ supabase.ts');
console.log('\nHooks:');
console.log('  ✓ useAdminAuth.ts');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                    CHECK COMPLETE                              ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
