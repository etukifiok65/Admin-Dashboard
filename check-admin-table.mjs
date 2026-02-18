import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAdmin() {
  console.log('🔐 Checking admin users table...\n');

  // List all tables (if possible)
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
    
  console.log('Tables in public schema:');
  if (tables) {
    tables.forEach(t => {
      if (t.table_name.includes('admin') || t.table_name.includes('user')) {
        console.log(`  ✓ ${t.table_name}`);
      }
    });
  }

  // Try different admin table names
  const tries = [
    'admin_users',
    'admins',
    'admin_accounts',
    'staff_accounts'
  ];

  console.log('\nChecking potential admin tables:');
  
  for (const tableName of tries) {
    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (!error) {
        console.log(`  ✅ ${tableName}: Found (count: ${count})`);
        if (data && data.length > 0) {
          console.log(`     Columns:`, Object.keys(data[0]));
        }
      }
    } catch (e) {
      // silently fail
    }
  }
}

checkAdmin().catch(console.error);
