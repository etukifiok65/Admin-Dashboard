/// <reference path="../types.d.ts" />

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

  const { data, error } = await adminClient
    .from('admin_users')
    .select('id, auth_id, email, name, role, is_active, last_login_at, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return jsonResponse({ error: error.message || 'Failed to fetch admin users' }, 400, origin);
  }

  return new Response(JSON.stringify(data || []), {
    status: 200,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });
});
