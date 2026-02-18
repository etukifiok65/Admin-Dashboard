# Fix Script for Admin RLS Issue
# This script will provision a super admin user from an existing auth account

# === Setup Instructions ===
# 
# The login is failing because:
# 1. User exists in auth.users (authentication works)
# 2. But NO record exists in admin_users table (authorization fails)
# 3. The new RLS policy blocks access for users without admin_users record
#
# SOLUTION: Create an admin_users record for your auth account
#

echo "=== Admin RLS Fix Script ==="
echo ""
echo "This script will help you set up the first super admin user."
echo ""

# Get auth user email from input or environment
if [ ! -z "$1" ]; then
  EMAIL="$1"
else
  echo "Enter the email of the auth user you want to make admin:"
  read EMAIL
fi

if [ -z "$EMAIL" ]; then
  echo "❌ No email provided"
  exit 1
fi

echo ""
echo "🔍 Looking for auth user: $EMAIL"
echo ""

# Use Supabase CLI to run SQL that finds and creates the admin record
# This works because we're using the linked project
supabase db execute --file - << 'EOF'
-- Step 1: Find the auth user
SELECT id, email FROM auth.users WHERE email = '$EMAIL';

-- Step 2: Insert or update admin_users record
INSERT INTO public.admin_users (auth_id, email, name, role, is_active)
SELECT 
  auth.id,
  auth.email,
  SPLIT_PART(auth.email, '@', 1),
  'super_admin',
  TRUE
FROM (SELECT id, email FROM auth.users WHERE email = '$EMAIL') AS auth
ON CONFLICT (auth_id) DO UPDATE SET
  role = 'super_admin',
  is_active = TRUE,
  updated_at = NOW()
RETURNING auth_id, email, role, is_active;
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Success! Admin record created/updated"
  echo ""
  echo "Next steps:"
  echo "  1. Log in with: $EMAIL"
  echo "  2. You should now be able to access the admin dashboard"
  echo ""
  echo "To verify:"
  echo "  1. Get your session token from browser DevTools (localStorage)"
  echo "  2. Run: node check-admin.js <your-token>"
else
  echo ""
  echo "❌ Failed to update database"
  echo "Please run manually:"
  echo ""
  echo "supabase sql --file - << 'SQL'"
  echo "INSERT INTO public.admin_users (auth_id, email, name, role, is_active)"
  echo "SELECT id, email, SPLIT_PART(email, '@', 1), 'super_admin', TRUE"
  echo "FROM auth.users WHERE email = '$EMAIL'"
  echo "ON CONFLICT (auth_id) DO UPDATE SET"
  echo "  role = 'super_admin',"
  echo "  is_active = TRUE;"
  echo "SQL"
  exit 1
fi
