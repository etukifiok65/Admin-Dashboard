#!/usr/bin/env node

/**
 * Provision a Super Admin User
 * 
 * This script creates an admin_users record for an existing auth user,
 * fixing the RLS authentication issue.
 * 
 * Usage:
 *   npm run provision-admin <email>
 *   npm run provision-admin  (will prompt for email)
 */

import { createInterface } from "readline";

// Helper to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("\n====================================");
  console.log("  Admin User Provisioning Script");
  console.log("====================================\n");

  console.log("This script will create an admin_users record for an existing");
  console.log("auth user, giving them admin access to the dashboard.\n");

  // Get email from argument or prompt
  let email = process.argv[2];
  let role = process.argv[3] || "super_admin"; // Default to super_admin

  if (!email) {
    console.log("Step 1: Get Auth User Email");
    console.log("─────────────────────────────");
    console.log(
      "First, check which users exist: npm run list-users\n"
    );

    email = await prompt("Enter the email to make admin: ");
  }

  if (!email || !email.includes("@")) {
    console.error("❌ Invalid email provided");
    process.exit(1);
  }

  // Validate role
  const validRoles = ["super_admin", "admin", "moderator"];
  if (!validRoles.includes(role)) {
    console.error(`❌ Invalid role: ${role}`);
    console.error(`Valid roles are: ${validRoles.join(", ")}`);
    process.exit(1);
  }

  console.log(`\n✅ Using email: ${email}`);
  console.log(`✅ Using role: ${role}`);
  console.log("\nStep 2: Connecting to Supabase...");
  console.log("─────────────────────────────");

  // Check environment
  const supabaseUrl = process.env.SUPABASE_URL || "https://spjqtdxnspndnnluayxp.supabase.co";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set");
    console.error("\nSet it with:");
    console.error("  Windows: set SUPABASE_SERVICE_ROLE_KEY=<your-key>");
    console.error("  Linux/Mac: export SUPABASE_SERVICE_ROLE_KEY=<your-key>");
    console.error("\nFind your key at:");
    console.error("  https://supabase.com/dashboard/project/spjqtdxnspndnnluayxp/settings/api");
    process.exit(1);
  }

  try {
    // Test connection
    const testRes = await fetch(`${supabaseUrl}/rest/v1/health`, {
      headers: { "apikey": serviceRoleKey },
    });

    if (!testRes.ok) {
      throw new Error("Supabase connection failed - check SERVICE_ROLE_KEY");
    }

    console.log("✅ Connected to Supabase");

    // Find the user
    console.log(`\nStep 3: Finding auth user: ${email}`);
    console.log("─────────────────────────");

    const findRes = await fetch(
      `${supabaseUrl}/rest/v1/auth.users?email=eq.${encodeURIComponent(email)}`,
      {
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Prefer": "count=exact",
        },
      }
    );

    const users = await findRes.json();
    const user = users?.[0];

    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log("\nTo create a new user:");
      console.log("  1. Go to your login page");
      console.log("  2. Sign up with: " + email);
      console.log("  3. Then run this script again");
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email confirmed: ${user.email_confirmed_at ? "Yes" : "No (user must confirm email first)"}`);

    // Create or update admin record
    console.log("\nStep 4: Creating admin_users record...");
    console.log("─────────────────────────────");

    const adminRes = await fetch(
      `${supabaseUrl}/rest/v1/admin_users`,
      {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          auth_id: user.id,
          email: user.email,
          name: user.email.split("@")[0],
          role: role,
          is_active: true,
        }),
      }
    );

    if (!adminRes.ok) {
      const errText = await adminRes.text();
      if (adminRes.status === 409) {
        // Conflict - user exists, update instead
        console.log("Record exists, updating...");

        const updateRes = await fetch(
          `${supabaseUrl}/rest/v1/admin_users?auth_id=eq.${encodeURIComponent(user.id)}`,
          {
            method: "PATCH",
            headers: {
              "apikey": serviceRoleKey,
              "Authorization": `Bearer ${serviceRoleKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              role: role,
              is_active: true,
            }),
          }
        );

        if (!updateRes.ok) {
          throw new Error(`Update failed: ${updateRes.status} ${await updateRes.text()}`);
        }
      } else {
        throw new Error(`Failed: ${adminRes.status} ${errText}`);
      }
    }

    console.log("✅ Admin record created/updated");

    console.log("\n" + "=".repeat(40));
    console.log("  ✨ SUCCESS!");
    console.log("=".repeat(40));
    console.log(`\n${email} is now a ${role.toUpperCase()}\n`);
    console.log("Next steps:");
    console.log("  1. Log in to the dashboard with: " + email);
    console.log("  2. You should now have full admin access\n");

    console.log("Role Details:");
    const roleInfo = {
      super_admin: "Full admin access • Can manage other admins",
      admin: "Full admin access • Limited management features",
      moderator: "Limited access • Content moderation only"
    };
    console.log(`  ${roleInfo[role]}\n`);

    console.log("To verify admin status:");
    console.log("  1. Log in and get your session token");
    console.log("  2. Run: npm run check-admin <token>\n");

    console.log("To add more admins:");
    console.log("  npm run provision-admin <another-email>\n");
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    console.error("\nTroubleshooting:");
    console.error("  • Check SUPABASE_SERVICE_ROLE_KEY is set correctly");
    console.error("  • Visit: https://supabase.com/dashboard/project/spjqtdxnspndnnluayxp/settings/api");
    console.error("  • Copy the service_role key (has 'eyJh' prefix)\n");
    process.exit(1);
  }
}

main();
