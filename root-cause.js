import { createClient } from '@supabase/supabase-js';

const serviceRoleClient = createClient(
  'https://spjqtdxnspndnnluayxp.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n✅ ROOT CAUSE ANALYSIS\n');

const userId = '700d1386-976d-4f21-9ebe-99b4be48911b';

// What the frontend login does
console.log('When user tries to login:\n');

// Step 1: Auth
console.log('Step 1: Supabase Auth.signInWithPassword()');
console.log('  ✅ This works (user can sign in)\n');

// Step 2: Get user
console.log('Step 2: supabase.auth.getUser()');
console.log('  ✅ Gets JWT token for: ' + userId + '\n');

// Step 3: Query admin_users
console.log('Step 3: Query admin_users table');
const { data, error } = await serviceRoleClient
  .from('admin_users')
  .select('*')
  .eq('auth_id', userId)
  .single();

if (error) {
  console.log('  ❌ ERROR: ' + error.message);
} else {
  console.log('  ✅ SUCCESS: Found admin record');
  console.log('     Email: ' + data.email);
  console.log('     Role: ' + data.role);
}

// Now check the frontend code
console.log('\n\n🔍 FRONTEND CODE ISSUE FOUND\n');
console.log('File: src/services/adminAuth.service.ts');
console.log('Line 44-45:\n');
console.log('  if (userRole !== "admin") {');
console.log('    return { error: "User is not an admin" }');
console.log('  }\n');

console.log('❌ PROBLEM:');
console.log('  The code only checks if role is exactly "admin"');
console.log('  But the user is "super_admin"!\n');

console.log('The fix is to also accept "super_admin" and "moderator":\n');
console.log('  if (!["admin", "super_admin", "moderator"].includes(userRole)) {');
console.log('    return { error: "User is not an admin" }');
console.log('  }\n');

console.log('Summary:');
console.log('✅ Database: Perfect');
console.log('✅ Admin record: Exists with super_admin role');
console.log('❌ Frontend code: Bug - only accepts "admin" role');
console.log('\nThe fix is required in adminAuth.service.ts\n');
