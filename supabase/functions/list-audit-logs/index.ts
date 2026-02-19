/// <reference path="../types.d.ts" />

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin: string) => origin.trim())
  .filter(Boolean);

const hasExplicitAllowedOrigins = allowedOrigins.length > 0;

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
];

const resolvedAllowedOrigins = hasExplicitAllowedOrigins ? allowedOrigins : defaultAllowedOrigins;

const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const getCorsHeaders = (origin: string | null) => {
  if (!hasExplicitAllowedOrigins && origin) {
    return {
      ...baseCorsHeaders,
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    };
  }

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
  const originAllowed = !hasExplicitAllowedOrigins || !origin || resolvedAllowedOrigins.includes(origin);

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

  let body: { limit?: number; tableFilter?: string | null } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsedLimit = Number(body.limit);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 5000) : 1000;

  const tableFilter = typeof body.tableFilter === 'string' && body.tableFilter.trim().length > 0
    ? body.tableFilter.trim()
    : null;

  let logsQuery = adminClient
    .from('audit_logs')
    .select('id, table_name, operation, record_id, user_id, old_data, new_data, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (tableFilter) {
    logsQuery = logsQuery.eq('table_name', tableFilter);
  }

  const { data: logs, error: logsError } = await logsQuery;

  if (logsError) {
    return jsonResponse({ error: logsError.message || 'Failed to fetch audit logs' }, 400, origin);
  }

  if (!logs || logs.length === 0) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  const userIds = [...new Set(logs.map((log) => log.user_id).filter(Boolean))];

  let adminUserMap = new Map<string, { name: string; email: string; role: string }>();

  if (userIds.length > 0) {
    const { data: adminUsers } = await adminClient
      .from('admin_users')
      .select('auth_id, name, email, role')
      .in('auth_id', userIds);

    adminUserMap = new Map(
      (adminUsers || []).map((user) => [
        user.auth_id,
        { name: user.name, email: user.email, role: user.role },
      ])
    );
  }

  const enrichedLogs = logs.map((log) => ({
    ...log,
    admin_user: log.user_id ? adminUserMap.get(log.user_id) ?? null : null,
  }));

  return new Response(JSON.stringify(enrichedLogs), {
    status: 200,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });
});
