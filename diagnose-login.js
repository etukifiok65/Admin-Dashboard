#!/usr/bin/env node

/**
 * Admin Login Diagnostics
 * 
 * This script helps diagnose why super admin login is failing
 * It checks:
 * 1. What auth users exist in the system
 * 2. What admin_users records exist
 * 3. RLS policy status
 * 4. Why access might be denied
 * 
 * Requirements:
 * - SUPABASE_SERVICE_ROLE_KEY environment variable set
 * - Node.js with fetch API (v18+)
 * 
 * Usage:
 *   node diagnose-login.js
 */

const SUPABASE_URL = "https://spjqtdxnspndnnluayxp.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set\n");
  console.error("Get your key from:");
  console.error("  https://supabase.com/dashboard/project/spjqtdxnspndnnluayxp/settings/api\n");
  console.error("Then set it:");
  console.error("  Windows PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY=\"your-key\"\n");
  console.error("  Windows CMD: set SUPABASE_SERVICE_ROLE_KEY=your-key\n");
  console.error("  Linux/Mac: export SUPABASE_SERVICE_ROLE_KEY=\"your-key\"\n");
  process.exit(1);
}

async function diagnose() {
  console.log("🔍 Admin Login Diagnostics\n");
  console.log("═".repeat(50));

  try {
    // 1. Check auth users
    console.log("\n1️⃣  Checking auth users...");
    const authRes = await fetch(`${SUPABASE_URL}/rest/v1/auth.users`, {
      method: "GET",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (!authRes.ok) {
      throw new Error(`Auth API failed: ${authRes.status}`);
    }

    const authUsers = await authRes.json();
    console.log(`   Found ${authUsers.length} auth user(s)`);
    
    if (authUsers.length === 0) {
      console.log("   ❌ No auth users - you need to sign up first!");
      console.log("      Go to login and create an account\n");
      process.exit(1);
    }

    console.log("\n   Auth Users:");
    authUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.email}`);
      console.log(`      ID: ${u.id}`);
      console.log(`      Confirmed: ${u.email_confirmed_at ? "✅ Yes" : "❌ No"}`);
    });

    // 2. Check admin_users table
    console.log("\n2️⃣  Checking admin_users table...");
    const adminRes = await fetch(`${SUPABASE_URL}/rest/v1/admin_users?select=*`, {
      method: "GET",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (!adminRes.ok) {
      if (adminRes.status === 404) {
        console.log("   ⚠️  admin_users table doesn't exist or not accessible");
      } else {
        throw new Error(`Admin API failed: ${adminRes.status}`);
      }
    } else {
      const adminUsers = await adminRes.json();
      console.log(`   Found ${adminUsers.length} admin record(s)`);

      if (adminUsers.length === 0) {
        console.log("   ❌ NO ADMIN RECORDS - This is the problem!");
        console.log("      The admin_users table is empty\n");
        console.log("   Solution:");
        console.log("      Run: npm run provision-admin <email>");
        console.log("      Example: npm run provision-admin user@example.com\n");
      } else {
        console.log("\n   Admin Users:");
        adminUsers.forEach((a, i) => {
          console.log(`   ${i + 1}. ${a.email}`);
          console.log(`      Role: ${a.role}`);
          console.log(`      Active: ${a.is_active ? "✅ Yes" : "❌ No"}`);
          console.log(`      Auth ID: ${a.auth_id}`);
        });

        // Check for mismatches
        console.log("\n3️⃣  Checking for mismatches...");
        const missingInAdmin = authUsers.filter(
          auth => !adminUsers.find(a => a.auth_id === auth.id)
        );

        if (missingInAdmin.length > 0) {
          console.log(`   ⚠️  ${missingInAdmin.length} auth user(s) not in admin_users:`);
          missingInAdmin.forEach(u => {
            console.log(`      - ${u.email} (ID: ${u.id})`);
          });
          console.log("\n   These users cannot access admin features!");
          console.log("   Solution: Run npm run provision-admin for each\n");
        } else {
          console.log("   ✅ All admin users have matching auth records");
        }

        // Check roles
        console.log("\n4️⃣  Checking roles...");
        const validRoles = ["super_admin", "admin", "moderator"];
        const invalidRoles = adminUsers.filter(
          a => !validRoles.includes(a.role)
        );

        if (invalidRoles.length > 0) {
          console.log(`   ⚠️  ${invalidRoles.length} record(s) with invalid role(s):`);
          invalidRoles.forEach(a => {
            console.log(`      - ${a.email}: role='${a.role}' (must be super_admin, admin, or moderator)`);
          });
        } else {
          console.log("   ✅ All roles are valid");
        }

        // Check is_active
        console.log("\n5️⃣  Checking is_active status...");
        const inactive = adminUsers.filter(a => !a.is_active);

        if (inactive.length > 0) {
          console.log(`   ⚠️  ${inactive.length} inactive record(s):`);
          inactive.forEach(a => {
            console.log(`      - ${a.email} (is_active=FALSE)`);
          });
          console.log("\n   These users are blocked!");
          console.log("   They need is_active set to TRUE\n");
        } else {
          console.log("   ✅ All admins are active");
        }
      }
    }

    // Summary
    console.log("\n" + "═".repeat(50));
    console.log("📋 DIAGNOSTIC SUMMARY\n");

    const issues = [];

    if (adminUsers && adminUsers.length === 0) {
      issues.push("❌ No admin_users records exist");
    }
    
    if (adminUsers && authUsers.length > adminUsers.length) {
      issues.push(`❌ ${authUsers.length - adminUsers.length} auth user(s) not in admin_users`);
    }

    if (adminUsers && adminUsers.some(a => !a.is_active)) {
      issues.push("❌ Some admin records are inactive");
    }

    if (adminUsers && adminUsers.some(a => !["super_admin", "admin", "moderator"].includes(a.role))) {
      issues.push("❌ Some admin records have invalid roles");
    }

    if (issues.length === 0) {
      console.log("✅ No obvious issues found!");
      console.log("   If login still fails, check:");
      console.log("   1. Browser console (F12) for network errors");
      console.log("   2. Supabase dashboard for RLS policy errors");
      console.log("   3. Email is confirmed in auth");
    } else {
      console.log("Issues Found:");
      issues.forEach(issue => console.log(`   ${issue}`));

      console.log("\n💡 How to fix:");
      console.log("   1. Set SERVICE_ROLE_KEY: $env:SUPABASE_SERVICE_ROLE_KEY=\"your-key\"");
      console.log("   2. Run: npm run provision-admin your-email@example.com");
      console.log("   3. Check: node diagnose-login.js (run this script again)");
    }

    console.log("\n" + "═".repeat(50) + "\n");

  } catch (err) {
    console.error("\n❌ Error during diagnostics:", err.message);
    console.error("\nMake sure:");
    console.error("  1. SERVICE_ROLE_KEY is set correctly");
    console.error("  2. The key starts with 'eyJh'");
    console.error("  3. Supabase project is accessible");
    process.exit(1);
  }
}

diagnose();
