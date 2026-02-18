#!/usr/bin/env node

/**
 * Direct Admin Provisioning via Supabase Client
 * Uses the installed @supabase/supabase-js package
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://spjqtdxnspndnnluayxp.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwanF0ZHhuc3BuZG5ubHVheXhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTUzNDI0MCwiZXhwIjoyMDgxMTEwMjQwfQ.8xtJ3ZQKg1HMHXTI9DKZMkZDE6a_AFuvs76EgXH_AMU";

const email = process.argv[2] || "homicareplus@gmail.com";
const role = process.argv[3] || "super_admin";

async function provision() {
  console.log("🔧 Provisioning admin...\n");

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Role: ${role}\n`);

    // List all auth users first
    console.log("📋 Finding auth user...");
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError || !users) {
      throw new Error(`Failed to list users: ${usersError?.message || "Unknown error"}`);
    }

    const authUser = users.find(u => u.email === email);

    if (!authUser) {
      console.log(`\n❌ Auth user not found: ${email}`);
      console.log("\nAvailable users:");
      users.forEach(u => console.log(`  • ${u.email}`));
      console.log("\n💡 You need to sign up first before provisioning as admin.");
      process.exit(1);
    }

    console.log(`✅ Found auth user: ${authUser.id}`);

    // Create or update admin_users record
    console.log("\n📝 Creating admin_users record...");
    
    const { data: result, error: insertError } = await supabase
      .from("admin_users")
      .upsert({
        auth_id: authUser.id,
        email: authUser.email,
        name: authUser.email.split("@")[0],
        role: role,
        is_active: true,
      }, { onConflict: "auth_id" })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create admin record: ${insertError.message}`);
    }

    console.log("✅ Admin record created/updated");
    console.log(`\n📊 Result:`);
    console.log(`   Email: ${result.email}`);
    console.log(`   Role: ${result.role}`);
    console.log(`   Active: ${result.is_active ? "Yes" : "No"}`);

    console.log("\n" + "=".repeat(50));
    console.log("  ✨ SUCCESS!");
    console.log("=".repeat(50));
    console.log(`\n${email} is now a ${role.toUpperCase()}\n`);
    console.log("Next steps:");
    console.log("  1. Log in to the dashboard with: " + email);
    console.log("  2. You should now have full admin access\n");

  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  }
}

provision();
