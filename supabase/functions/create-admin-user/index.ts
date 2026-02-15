import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CreateAdminPayload = {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authUser, error: authError } = await adminClient.auth.getUser(token);

  if (authError || !authUser?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: requester, error: requesterError } = await adminClient
    .from('admin_users')
    .select('role, is_active')
    .eq('auth_id', authUser.user.id)
    .single();

  if (requesterError || !requester?.is_active) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (requester.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Super admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: CreateAdminPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!payload.email || !payload.password || !payload.name || !payload.role) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      name: payload.name,
      role: payload.role,
    },
  });

  if (createAuthError || !createdAuth?.user) {
    return new Response(JSON.stringify({ error: createAuthError?.message || 'Failed to create auth user' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: adminRecord, error: adminError } = await adminClient
    .from('admin_users')
    .insert({
      auth_id: createdAuth.user.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      is_active: true,
    })
    .select()
    .single();

  if (adminError) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    return new Response(JSON.stringify({ error: adminError.message || 'Failed to create admin record' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      id: adminRecord.id,
      auth_id: adminRecord.auth_id,
      email: adminRecord.email,
      name: adminRecord.name,
      role: adminRecord.role,
      is_active: adminRecord.is_active,
      last_login_at: adminRecord.last_login_at,
      created_at: adminRecord.created_at,
      updated_at: adminRecord.updated_at,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
