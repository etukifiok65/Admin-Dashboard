#!/usr/bin/env node

/**
 * Check Admin Status for a Session Token
 * 
 * Gets a user's session token and checks if they have admin access
 * 
 * Usage: npm run check-admin <your-session-token>
 * 
 * To get your session token:
 * 1. Log in to the app
 * 2. Open browser DevTools (F12)
 * 3. Go to Application -> Local Storage
 * 4. Find: sb-XXXXX-auth-token
 * 5. Copy the entire value
 * 6. Run: npm run check-admin <paste-token-here>
 */

const SUPABASE_URL = "https://spjqtdxnspndnnluayxp.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/check-admin-status`;

// This script will need to be run with a valid JWT token from an authenticated admin user
// Usage: Pass your session token as an argument

const token = process.argv[2];

if (!token) {
  console.error("Error: No token provided");
  console.error("Usage: npm run check-admin <your-session-token>");
  process.exit(1);
}

fetch(FUNCTION_URL, {
  method: "GET",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  },
})
  .then((res) => res.json())
  .then((data) => {
    console.log("Admin Status Check:");
    console.log(JSON.stringify(data, null, 2));

    if (!data.admin_exists) {
      console.log("\n⚠️  WARNING: User is authenticated but NOT in admin_users table!");
      console.log("This is why login fails. The RLS policy requires an admin_users record.");
    }
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
