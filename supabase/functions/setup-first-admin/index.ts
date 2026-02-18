import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Deno script to provision the first super admin user
// Usage: deno run --allow-env setup-first-admin.ts <email>

const email = Deno.args[0];

if (!email) {
  console.error("Usage: deno run --allow-env setup-first-admin.ts <email>");
  Deno.exit(1);
}

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables required");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`🔍 Looking up auth user with email: ${email}`);

// Find the auth user
const { data: users, error: userError } = await supabase.auth.admin.listUsers();

if (userError) {
  console.error("❌ Error listing users:", userError);
  Deno.exit(1);
}

const authUser = users?.find((u) => u.email === email);

if (!authUser) {
  console.error(`❌ Auth user not found with email: ${email}`);
  console.error("Available users:", users?.map((u) => u.email).join(", "));
  Deno.exit(1);
}

console.log(`✅ Found auth user: ${authUser.id}`);

// Check if admin record exists
const { data: existingAdmin, error: checkError } = await supabase
  .from("admin_users")
  .select("*")
  .eq("auth_id", authUser.id)
  .single();

if (!checkError || existingAdmin) {
  if (existingAdmin) {
    console.log("⚠️  Admin record already exists:", existingAdmin);
    console.log("Updating to ensure super_admin role and is_active=TRUE...");
  }

  // Update existing record
  const { data: updated, error: updateError } = await supabase
    .from("admin_users")
    .update({
      role: "super_admin",
      is_active: true,
      name: email.split("@")[0],
    })
    .eq("auth_id", authUser.id)
    .select()
    .single();

  if (updateError) {
    console.error("❌ Error updating admin record:", updateError);
    Deno.exit(1);
  }

  console.log("✅ Admin record updated:", updated);
} else {
  // Create new record
  console.log("📝 Creating new admin_users record...");

  const { data: newAdmin, error: insertError } = await supabase
    .from("admin_users")
    .insert({
      auth_id: authUser.id,
      email: authUser.email,
      name: authUser.email?.split("@")[0] || "Admin",
      role: "super_admin",
      is_active: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error("❌ Error creating admin record:", insertError);
    Deno.exit(1);
  }

  console.log("✅ Admin record created:", newAdmin);
}

console.log("\n✨ Success! Super admin user is now active.");
console.log(`\nYou can now log in with: ${email}`);
console.log("\nTo verify, run:");
console.log("  node check-admin.js <your-session-token>");
