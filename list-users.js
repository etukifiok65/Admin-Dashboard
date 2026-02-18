#!/usr/bin/env node

/**
 * List all auth users and admin_users status
 * Run this to see what accounts exist in the system
 * 
 * Usage: node list-users.js
 * Then: npm run check-admin <token-from-login>
 */

const SUPABASE_URL = "https://spjqtdxnspndnnluayxp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY environment variable not set");
  console.error("Set it with: export SUPABASE_SERVICE_ROLE_KEY=<your-key>");
  process.exit(1);
}

async function listUsers() {
  console.log("🔍 Fetching auth users and admin status...\n");

  try {
    // Fetch auth.users (requires service role)
    const authRes = await fetch(`${SUPABASE_URL}/rest/v1/auth.users`, {
      method: "GET",
      headers: {
        "apikey": SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      },
    });

    if (!authRes.ok) {
      // Fallback: use admin API
      console.log("Using Admin API to list users...\n");
      const adminRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users`,
        {
          method: "GET",
          headers: {
            "apikey": SUPABASE_ANON_KEY || "",
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (!adminRes.ok) {
        throw new Error(
          `Admin API error: ${adminRes.status} ${await adminRes.text()}`
        );
      }

      const data = await adminRes.json();
      displayUsers(data.users || []);
      return;
    }

    const authUsers = await authRes.json();
    displayUsers(authUsers);
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function displayUsers(users) {
  if (!users || users.length === 0) {
    console.log("❌ No auth users found in the system");
    console.log("\nTo create your first account:");
    console.log("  1. Go to: https://app.yourapp.com/login");
    console.log("  2. Sign up with an email");
    console.log("  3. Confirm email if needed");
    console.log("  4. Then run: npm run provision-admin");
    return;
  }

  console.log("📋 Auth Users in the System:\n");
  users.forEach((user, i) => {
    console.log(`${i + 1}. Email: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Status: ${user.email_confirmed_at ? "✅ Confirmed" : "⏳ Unconfirmed"}`);
    console.log("");
  });

  console.log("Next steps:");
  console.log("  1. Copy an email from above");
  console.log("  2. Run: npm run provision-admin <email>");
  console.log("     Example: npm run provision-admin user@example.com");
}

listUsers();
