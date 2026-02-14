# Admin Dashboard Setup Guide

## Overview

The HomiCare Admin Dashboard is a separate web application designed to manage the HomiCare Plus platform. It uses the same Supabase backend as the mobile app but with dedicated authentication and authorization for admin users.

## Database Setup

The admin system requires two new database components:

### 1. Admin Users Table

Created in migration `20260213000200_create_admin_users.sql`:

```sql
CREATE TABLE public.admin_users (
    id UUID PRIMARY KEY,
    auth_id UUID REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 2. Row-Level Security (RLS) Policies

Admin-specific RLS policies allow admins to:
- View all patient data
- View all provider data
- Update provider account status
- Review and approve provider documents
- View all appointments
- Manage transactions and payouts
- View analytics and metrics

## Creating Admin Users

### Method 1: Via Supabase Dashboard

1. Go to Supabase Dashboard > Authentication > Users
2. Create a new user with email and password
3. Connect to your database using Supabase SQL Editor
4. Insert admin user record:

```sql
INSERT INTO public.admin_users (auth_id, email, name)
SELECT 
    id, 
    email, 
    'Admin Name'
FROM auth.users
WHERE email = 'admin@example.com';
```

### Method 2: Via SQL (Direct)

```sql
-- First, create auth user (requires Supabase dashboard or API)
-- Then insert admin record for that user:

INSERT INTO public.admin_users (
    auth_id,
    email,
    name,
    role,
    is_active
) VALUES (
    'USER_UUID_HERE',
    'admin@example.com',
    'Admin User',
    'admin',
    TRUE
);
```

### Method 3: Via Supabase Edge Function (Recommended)

Create an endpoint to securely create admin users:

```typescript
// supabase/functions/create-admin/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const adminKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { email, password, name } = await req.json();

  const supabase = createClient(supabaseUrl, adminKey);

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return new Response(JSON.stringify(authError), { status: 400 });

  // Create admin user record
  const { error: adminError } = await supabase
    .from("admin_users")
    .insert({
      auth_id: authUser.user.id,
      email,
      name,
      role: "admin",
      is_active: true,
    });

  if (adminError) {
    // Clean up auth user if admin record insert fails
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return new Response(JSON.stringify(adminError), { status: 400 });
  }

  return new Response(
    JSON.stringify({ message: "Admin user created successfully" }),
    { status: 201 }
  );
});
```

## Admin User Management

### Activate/Deactivate Admin

```sql
-- Deactivate an admin
UPDATE public.admin_users
SET is_active = FALSE
WHERE email = 'admin@example.com';

-- Reactivate an admin
UPDATE public.admin_users
SET is_active = TRUE
WHERE email = 'admin@example.com';
```

### View Active Admins

```sql
SELECT id, email, name, is_active, last_login_at, created_at
FROM public.admin_users
WHERE is_active = TRUE
ORDER BY created_at;
```

### Delete Admin User

```sql
-- First deactivate
UPDATE public.admin_users
SET is_active = FALSE
WHERE email = 'admin@example.com';

-- Then delete when ready
DELETE FROM public.admin_users
WHERE email = 'admin@example.com';

-- Also delete from auth.users if needed
DELETE FROM auth.users
WHERE email = 'admin@example.com';
```

## Accessing the Admin Dashboard

1. Start the admin dashboard:
   ```bash
   cd admin-dashboard
   npm install
   npm run dev
   ```

2. Navigate to `http://localhost:3000`

3. Log in with admin credentials:
   - Email: admin's email address
   - Password: admin's password

4. You'll be redirected to the dashboard upon successful authentication

## RLS Security Notes

The RLS policies ensure:

- **Isolation**: Admins can only access data they have explicit permissions for
- **Audit Trail**: All admin actions are logged through Supabase's built-in audit logs
- **No Bypass**: Even with JWT tokens, invalid roles cannot bypass RLS
- **Data Integrity**: Sensitive operations (payouts, verification) are controlled

## Environment Configuration

The admin dashboard requires these environment variables:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3001
```

The anon key is safe to expose since RLS policies control access at the database level.

## Testing Admin Access

To verify RLS policies are working:

1. Log in as admin and fetch patient data
2. Use browser DevTools to inspect the JWT token
3. Verify the token is valid and contains admin claims
4. Attempt to access data as a non-admin user (should fail)

## Troubleshooting

### Admin can't log in
- Check if `admin_users` record exists for the email
- Verify `is_active = TRUE`
- Check Supabase auth logs for authentication errors

### RLS policy errors
- Ensure migrations have been applied
- Check that auth.uid() returns the correct user ID
- Verify the user's UUID matches in both `auth.users` and `admin_users`

### Performance issues
- Ensure indexes are created on `admin_users(auth_id)` and `admin_users(email)`
- Use the `get_admin_metrics()` RPC function for aggregated data
- Implement database connection pooling for high-load scenarios
