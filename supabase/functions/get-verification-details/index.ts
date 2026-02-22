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

  if (!['super_admin', 'admin', 'moderator'].includes(requester.role)) {
    return jsonResponse({ error: 'Forbidden' }, 403, origin);
  }

  let body: { entity?: string; id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, origin);
  }

  const entity = body.entity;
  const id = body.id;

  if (!entity || !id || !['patient', 'provider'].includes(entity)) {
    return jsonResponse({ error: 'Invalid entity or id' }, 400, origin);
  }

  if (entity === 'patient') {
    const { data: patient, error: patientError } = await adminClient
      .from('patients')
      .select(`
        *,
        patient_addresses(*),
        emergency_contacts(*),
        medical_info(*)
      `)
      .eq('id', id)
      .single();

    if (patientError || !patient) {
      return jsonResponse({ error: patientError?.message || 'Patient not found' }, 404, origin);
    }

    const normalizedPatient = {
      ...patient,
      medical_info: Array.isArray(patient.medical_info)
        ? patient.medical_info[0] || null
        : patient.medical_info || null,
    };

    let patientEmail = normalizedPatient.email || '';
    if ((!patientEmail || patientEmail.trim().length === 0) && normalizedPatient.auth_id) {
      const { data: authLookup } = await adminClient.auth.admin.getUserById(normalizedPatient.auth_id);
      patientEmail = authLookup?.user?.email || patientEmail;
    }

    let patientDocuments: Array<Record<string, unknown>> = [];

    const { data: patientDocs } = await adminClient
      .from('patient_documents')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: false });

    if (patientDocs && patientDocs.length > 0) {
      patientDocuments = patientDocs as Array<Record<string, unknown>>;
    }

    if (patientDocuments.length === 0) {
      const { data: altPatientDocs } = await adminClient
        .from('patient_verification_documents')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      if (altPatientDocs && altPatientDocs.length > 0) {
        patientDocuments = altPatientDocs as Array<Record<string, unknown>>;
      }
    }

    if (patientDocuments.length === 0) {
      const candidateKeys = [
        'identity_document_url',
        'verification_document_url',
        'document_url',
        'government_id_url',
        'id_card_url',
        'nin_document_url',
        'bvn_document_url',
        'proof_of_address_url',
        'profile_image_url',
      ];

      patientDocuments = candidateKeys
        .filter((key) => typeof normalizedPatient[key] === 'string' && String(normalizedPatient[key]).trim().length > 0)
        .map((key) => ({
          id: `${key}-${id}`,
          patient_id: id,
          document_type: key.replace(/_url$/, ''),
          storage_path: String(normalizedPatient[key]),
          verification_status: normalizedPatient.verification_status || 'pending',
          submitted_at: normalizedPatient.updated_at || normalizedPatient.created_at,
        }));
    }

    // If still no documents, list files from patient-documents storage bucket
    // Documents are stored in folders named after the auth_id (UUID)
    if (patientDocuments.length === 0 && normalizedPatient.auth_id) {
      try {
        const authId = normalizedPatient.auth_id;
        const { data: storageObjects, error: storageError } = await adminClient.storage
          .from('patient-documents')
          .list(authId, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (!storageError && storageObjects && storageObjects.length > 0) {
          // Create dummy document records from storage objects
          patientDocuments = (storageObjects as Array<Record<string, unknown>>)
            .filter((obj) => obj.name && typeof obj.name === 'string' && !obj.name.endsWith('/'))
            .map((obj) => ({
              id: `storage-${authId}-${obj.name}`,
              patient_id: id,
              document_type: 'uploaded_document',
              storage_path: `${authId}/${obj.name}`,
              verification_status: normalizedPatient.verification_status || 'pending',
              submitted_at: obj.created_at || new Date().toISOString(),
              file_name: obj.name,
              file_size: obj.metadata?.size || 0,
            }));
        }
      } catch (err) {
        // Silent fail - storage query is best-effort fallback
        console.error('Error listing patient documents from storage:', err);
      }
    }

    return new Response(JSON.stringify({
      ...normalizedPatient,
      email: patientEmail,
      patient_documents: patientDocuments,
    }), {
      status: 200,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }

  const { data: provider, error: providerError } = await adminClient
    .from('providers')
    .select('*, provider_documents(*)')
    .eq('id', id)
    .single();

  if (providerError || !provider) {
    return jsonResponse({ error: providerError?.message || 'Provider not found' }, 404, origin);
  }

  let providerEmail = provider.email || '';
  if ((!providerEmail || providerEmail.trim().length === 0) && provider.auth_id) {
    const { data: authLookup } = await adminClient.auth.admin.getUserById(provider.auth_id);
    providerEmail = authLookup?.user?.email || providerEmail;
  }

  return new Response(JSON.stringify({
    ...provider,
    email: providerEmail,
    provider_documents: provider.provider_documents || [],
  }), {
    status: 200,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });
});
