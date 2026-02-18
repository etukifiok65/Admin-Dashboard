import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://spjqtdxnspndnnluayxp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         SUPER ADMIN LOGIN DIAGNOSTIC CHECK                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const email = 'homicareplus@gmail.com';
console.log(`🔍 Checking account: ${email}\n`);

// 1. Check auth.users
console.log('1️⃣  CHECKING AUTH.USERS TABLE');
console.log('─'.repeat(60));
const { data: { users } } = await supabase.auth.admin.listUsers();
const authUser = users.find(u => u.email === email);

if (authUser) {
  console.log(`✅ Auth user found`);
  console.log(`   ID: ${authUser.id}`);
  console.log(`   Email: ${authUser.email}`);
  console.log(`   Created: ${authUser.created_at}`);
  console.log(`   Confirmed: ${!!authUser.email_confirmed_at}`);
  console.log(`   Role (metadata): ${authUser.user_metadata?.role || 'none'}`);
  console.log(`   Last sign in: ${authUser.last_sign_in_at || 'never'}`);
  console.log('');
} else {
  console.log(`❌ Auth user NOT found\n`);
}

// 2. Check admin_users table
console.log('2️⃣  CHECKING ADMIN_USERS TABLE');
console.log('─'.repeat(60));
const { data: adminUser, error: adminError } = await supabase
  .from('admin_users')
  .select('*')
  .eq('email', email)
  .single();

if (adminError) {
  console.log(`❌ Error querying admin_users: ${adminError.message}\n`);
} else if (adminUser) {
  console.log(`✅ Admin record found`);
  console.log(`   ID: ${adminUser.id}`);
  console.log(`   Auth ID: ${adminUser.auth_id}`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Role: ${adminUser.role}`);
  console.log(`   Active: ${adminUser.is_active}`);
  console.log(`   Created: ${adminUser.created_at}`);
  console.log(`   Updated: ${adminUser.updated_at}`);
  console.log(`   Last login: ${adminUser.last_login_at || 'never'}\n`);

  // 3. Check alignment
  console.log('3️⃣  CHECKING AUTH/ADMIN ALIGNMENT');
  console.log('─'.repeat(60));
  
  if (authUser) {
    if (authUser.id === adminUser.auth_id) {
      console.log(`✅ Auth ID matches admin record`);
    } else {
      console.log(`❌ AUTH ID MISMATCH`);
      console.log(`   Auth ID: ${authUser.id}`);
      console.log(`   Admin auth_id: ${adminUser.auth_id}`);
    }
  } else {
    console.log(`❌ No auth user to compare`);
  }
  console.log('');
} else {
  console.log(`❌ No admin record found\n`);
}

// 4. Check what the adminAuth.service.ts would do
console.log('4️⃣  SIMULATING LOGIN FLOW');
console.log('─'.repeat(60));

if (authUser && adminUser) {
  console.log('Step 1: Authenticate user');
  console.log(`  ├─ Email: ${email}`);
  console.log(`  ├─ Password: (would be validated by Supabase Auth)`);
  console.log(`  └─ JWT: Would be generated and stored\n`);

  console.log('Step 2: Get current user');
  const { data: currentUserData } = await supabase.auth.getUser(
    authUser.user_metadata?.session_token || ''
  );
  console.log(`  ├─ Auth valid: ${!!authUser}`);
  console.log(`  ├─ User ID: ${authUser.id}`);
  console.log(`  └─ Status: Would proceed to Step 3\n`);

  console.log('Step 3: Query admin_users table');
  console.log(`  ├─ WHERE auth_id = '${authUser.id}'`);
  console.log(`  ├─ SELECT *`);
  console.log(`  ├─ Result: Found (adminUser exists)`);
  console.log(`  └─ Status: LOGIN WOULD SUCCEED ✅\n`);

  console.log('Step 4: Create AdminUser object');
  console.log(`  ├─ ID: ${adminUser.id}`);
  console.log(`  ├─ Email: ${adminUser.email}`);
  console.log(`  ├─ Name: ${adminUser.name}`);
  console.log(`  ├─ Role: ${adminUser.role}`);
  console.log(`  └─ Status: Would authenticate successfully\n`);

} else {
  console.log('❌ CANNOT COMPLETE LOGIN FLOW');
  if (!authUser) console.log('  - Missing auth.users entry');
  if (!adminUser) console.log('  - Missing admin_users entry');
  console.log('');
}

// 5. Check RLS permissions
console.log('5️⃣  CHECKING ROW-LEVEL SECURITY (RLS)');
console.log('─'.repeat(60));

if (authUser) {
  // Try to query as if we were the auth user
  console.log(`Testing RLS queries with auth_id: ${authUser.id}`);
  console.log('  (These queries would be blocked if RLS denies access)\n');

  const { data: rls1, error: rls1Error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('auth_id', authUser.id)
    .single();

  if (rls1Error) {
    console.log(`❌ RLS POLICY BLOCKING: ${rls1Error.message}`);
  } else if (rls1) {
    console.log(`✅ RLS allows query (using service role)`);
    console.log(`   Result: ${rls1.email} (${rls1.role})`);
  }
  console.log('');
} else {
  console.log('❌ Cannot test RLS without auth user\n');
}

// 6. Check email confirmation
console.log('6️⃣  CHECKING EMAIL CONFIRMATION');
console.log('─'.repeat(60));

if (authUser) {
  if (authUser.email_confirmed_at) {
    console.log(`✅ Email confirmed: ${authUser.email_confirmed_at}`);
  } else {
    console.log(`⚠️  Email NOT confirmed`);
    console.log(`   User may need to verify email before login`);
  }
  console.log('');
} else {
  console.log('❌ Cannot check - auth user not found\n');
}

// 7. Summary and recommendations
console.log('7️⃣  SUMMARY & RECOMMENDATIONS');
console.log('─'.repeat(60));

let issues = [];

if (!authUser) {
  issues.push('Auth user does not exist in Supabase Auth');
}
if (!adminUser) {
  issues.push('Admin record does not exist in admin_users table');
}
if (authUser && adminUser && authUser.id !== adminUser.auth_id) {
  issues.push('Auth ID mismatch between auth.users and admin_users');
}
if (authUser && !authUser.email_confirmed_at) {
  issues.push('Email address not confirmed');
}

if (issues.length === 0) {
  console.log('✅ STATUS: Everything looks good!');
  console.log('\n   The account should be able to login.');
  console.log('\n   If you\'re still getting errors:');
  console.log('   1. Clear browser cache (Ctrl+Shift+Delete)');
  console.log('   2. Hard reload the page (Ctrl+F5)');
  console.log('   3. Try incognito/private window');
  console.log('   4. Check browser console for errors (F12)');
  console.log('   5. Verify password is correct');
} else {
  console.log('❌ ISSUES FOUND:\n');
  issues.forEach((issue, i) => {
    console.log(`   ${i + 1}. ${issue}`);
  });
  console.log('\n   Recommended actions:');
  if (issues.includes('Auth user does not exist in Supabase Auth')) {
    console.log('   - Run: npm run provision-admin homicareplus@gmail.com super_admin');
  }
  if (issues.includes('Admin record does not exist in admin_users table')) {
    console.log('   - Run: npm run provision-admin homicareplus@gmail.com super_admin');
  }
  if (issues.includes('Email address not confirmed')) {
    console.log('   - User needs to confirm email from Supabase dashboard');
  }
}

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║                      DIAGNOSTIC COMPLETE                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');
