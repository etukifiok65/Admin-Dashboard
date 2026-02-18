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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" } as ErrorResponse),
        { headers: corsHeaders, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase credentials" } as ErrorResponse),
        { headers: corsHeaders, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the user from the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({
          authenticated: false,
          error: userError?.message || "User not found",
        } as AdminCheckResponse),
        { headers: corsHeaders, status: 401 }
      );
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

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      } as ErrorResponse),
      { headers: corsHeaders, status: 500 }
    );
  }
});
