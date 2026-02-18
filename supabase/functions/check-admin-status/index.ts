import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface ErrorResponse {
  error: string;
  details?: unknown;
}

interface AdminCheckResponse {
  authenticated: boolean;
  user_id?: string;
  user_email?: string;
  admin_record?: unknown;
  admin_exists: boolean;
  is_active?: boolean;
  role?: string;
  error?: string;
}

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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('Origin');
  const originAllowed = !hasExplicitAllowedOrigins || !origin || resolvedAllowedOrigins.includes(origin);

  if (!originAllowed) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, origin);
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(origin), status: 204 });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Missing Supabase credentials" }, 500, origin);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the user from the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return jsonResponse({
          authenticated: false,
          error: userError?.message || "User not found",
        }, 401, origin);
    }

    // Query admin_users table with service role (bypasses RLS)
    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("auth_id", userData.user.id)
      .single();

    const response: AdminCheckResponse = {
      authenticated: true,
      user_id: userData.user.id,
      user_email: userData.user.email,
      admin_exists: !adminError && adminData !== null,
      admin_record: adminData || null,
    };

    if (adminData) {
      response.is_active = adminData.is_active;
      response.role = adminData.role;
    }

    if (adminError && adminError.code !== "PGRST116") {
      response.error = `Database error: ${adminError.message}`;
    }

    return jsonResponse(response as Record<string, unknown>, 200, origin);
  } catch (error) {
    return jsonResponse({
        error: error instanceof Error ? error.message : String(error),
      }, 500, origin);
  }
});
