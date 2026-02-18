import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://spjqtdxnspndnnluayxp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MzQyNDAsImV4cCI6MjA4MTExMDI0MH0.M9_iFAAHlUEs9_rTrKbQcykLte_NOWKiOTvmeKaC9Mc';

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
