/// <reference path="../types.d.ts" />

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

type CreateAdminPayload = {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
};

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin: string) => origin.trim())
  .filter(Boolean);

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

const resolvedAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultAllowedOrigins;

const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const getCorsHeaders = (origin: string | null) => {
  if (origin && resolvedAllowedOrigins.includes(origin)) {
    return {
      ...baseCorsHeaders,
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    };
  }

  return baseCorsHeaders;
};

const jsonResponse = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const originAllowed = !origin || resolvedAllowedOrigins.includes(origin);

  if (!originAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, origin);
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500, origin);
  }

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return jsonResponse({ error: 'Missing authorization' }, 401, origin);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: authUser, error: authError } = await adminClient.auth.getUser(token);

  if (authError || !authUser?.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401, origin);
  }

  const { data: requester, error: requesterError } = await adminClient
    .from('admin_users')
    .select('role, is_active')
    .eq('auth_id', authUser.user.id)
    .single();

  if (requesterError || !requester?.is_active) {
    return jsonResponse({ error: 'Forbidden' }, 403, origin);
  }

  if (requester.role !== 'super_admin') {
    return jsonResponse({ error: 'Super admin only' }, 403, origin);
  }

  let payload: CreateAdminPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400, origin);
  }

  if (!payload.email || !payload.password || !payload.name || !payload.role) {
    return jsonResponse({ error: 'Missing required fields' }, 400, origin);
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
    return jsonResponse({ error: createAuthError?.message || 'Failed to create auth user' }, 400, origin);
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
    return jsonResponse({ error: adminError.message || 'Failed to create admin record' }, 400, origin);
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
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    }
  );
});
