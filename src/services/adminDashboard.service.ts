import { supabase } from './supabase';
import type {
  DashboardMetrics,
  Patient,
  PatientDetails,
  PatientDocument,
  Provider,
  ProviderDetails,
  ProviderDocument,
  Appointment,
  AppointmentDetails,
  AppointmentLocationDisputeSnapshot,
  AppointmentLocationDisputeSnapshotRow,
  ListResponse,
  PaginationOptions,
  FinancialMetrics,
  ProviderPayout,
  TransactionRecord,
  PlatformRevenueLog,
  SupportMessage,
  SupportMessageDetails,
  AppointmentsByService,
  LocationAnalytics,
  ProviderEarnings,
  ProviderRating,
  AppointmentTrendData,
  AnalyticsMetrics,
  AdminUserSettings,
  PlatformConfiguration,
  ServiceTypeConfig,
  AppointmentStatusConfig,
  AuditLog,
} from '@app-types/index';

const SEARCH_INPUT_MAX_LENGTH = 80;

const sanitizeSearchTerm = (input: string): string => {
  return input
    .trim()
    .slice(0, SEARCH_INPUT_MAX_LENGTH)
    .replace(/[^a-zA-Z0-9@._+\-\s]/g, '')
    .replace(/\s+/g, ' ');
};

class AdminDashboardService {
  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics | null> {
    try {
      // Get total users count
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      const { count: totalProviders } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true });

      // Get active patients (those with appointments in the last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activePatientAppointments } = await supabase
        .from('appointments')
        .select('patient_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const activePatientIds = new Set(
        activePatientAppointments?.map((a) => a.patient_id) || []
      );

      // Get verified providers
      const { count: verifiedProviders } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true);

      // Get pending providers
      const { count: pendingProviders } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .in('account_status', ['pending', 'document_pending', 'pending_approval']);

      // Get pending patients
      const { count: pendingPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'pending');

      // Get today's appointments (scheduled for today's date)
      const today = new Date();
      const todayDateStr = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('scheduled_date', todayDateStr);

      // Get today's revenue (platform's 20% commission from appointments completed today)
      today.setHours(0, 0, 0, 0);
      const { data: todayCompletedAppointments } = await supabase
        .from('appointments')
        .select('total_cost')
        .eq('status', 'Completed')
        .gte('updated_at', today.toISOString());

      const todayRevenue = (todayCompletedAppointments || []).reduce(
        (sum, a) => sum + (a.total_cost ? parseFloat(a.total_cost.toString()) * 0.2 : 0),
        0
      );

      // Get this month's revenue (platform's 20% commission from completed appointments this month)
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: monthCompletedAppointments } = await supabase
        .from('appointments')
        .select('total_cost')
        .eq('status', 'Completed')
        .gte('updated_at', monthStart.toISOString());

      const thisMonthRevenue = (monthCompletedAppointments || []).reduce(
        (sum, a) => sum + (a.total_cost ? parseFloat(a.total_cost.toString()) * 0.2 : 0),
        0
      );

      const metrics = {
        totalUsers: (totalPatients || 0) + (totalProviders || 0),
        activePatients: activePatientIds.size,
        verifiedProviders: verifiedProviders || 0,
        pendingProviders: pendingProviders || 0,
        pendingPatients: pendingPatients || 0,
        todayAppointments: todayAppointments || 0,
        todayRevenue,
        thisMonthRevenue,
      };

      return metrics;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return null;
    }
  }

  /**
   * Get patients list with pagination
   */
  async getPatients(
    options: PaginationOptions,
    params?: {
      search?: string;
      status?: 'pending' | 'approved' | 'rejected' | 'all';
      sort?: 'newest' | 'oldest';
    }
  ): Promise<ListResponse<Patient> | null> {
    try {
      let query = supabase
        .from('patients')
        .select('*', { count: 'exact' });

      if (params?.search) {
        const safeSearch = sanitizeSearchTerm(params.search);

        if (safeSearch) {
        query = query.or(
          `name.ilike.%${safeSearch}%,phone_number.like.%${safeSearch}%`
        );
        }
      }

      if (params?.status && params.status !== 'all') {
        query = query.eq('verification_status', params.status);
      }

      const sortAscending = params?.sort === 'oldest';

      const { data, count, error } = await query
        .order('created_at', { ascending: sortAscending })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) {
        throw new Error(error.message || 'Failed to load patients');
      }

      return {
        data: (data || []) as Patient[],
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  }

  /**
   * Get providers list with pagination
   */
  async getProviders(
    options: PaginationOptions,
    params?: {
      search?: string;
      status?: 'pending' | 'approved' | 'rejected' | 'document_pending' | 'pending_approval' | 'all';
      sort?: 'newest' | 'oldest';
    }
  ): Promise<ListResponse<Provider> | null> {
    try {
      let query = supabase
        .from('providers')
        .select('*', { count: 'exact' });

      if (params?.status && params.status !== 'all') {
        query = query.eq('account_status', params.status);
      }

      if (params?.search) {
        const safeSearch = sanitizeSearchTerm(params.search);

        if (safeSearch) {
        query = query.or(
          `name.ilike.%${safeSearch}%,specialty.ilike.%${safeSearch}%,phone_number.like.%${safeSearch}%,license_number.ilike.%${safeSearch}%`
        );
        }
      }

      const sortAscending = params?.sort === 'oldest';

      const { data, count, error } = await query
        .order('created_at', { ascending: sortAscending })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) {
        throw error;
      }

      return {
        data: (data || []) as Provider[],
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching providers:', error);
      return null;
    }
  }

  /**
   * Get providers pending verification
   */
  async getPendingProviders(
    options: PaginationOptions,
    params?: {
      search?: string;
      status?: 'pending' | 'document_pending' | 'pending_approval' | 'all';
      sort?: 'newest' | 'oldest';
    }
  ): Promise<ListResponse<Provider> | null> {
    try {
      let query = supabase
        .from('providers')
        .select('*', { count: 'exact' });

      if (params?.status && params.status !== 'all') {
        query = query.eq('account_status', params.status);
      } else {
        query = query.in('account_status', [
          'pending',
          'document_pending',
          'pending_approval',
        ]);
      }

      if (params?.search) {
        const safeSearch = sanitizeSearchTerm(params.search);

        if (safeSearch) {
        query = query.or(
          `name.ilike.%${safeSearch}%,specialty.ilike.%${safeSearch}%,phone_number.like.%${safeSearch}%,license_number.ilike.%${safeSearch}%`
        );
        }
      }

      const sortAscending = params?.sort === 'oldest';

      const { data, count, error } = await query
        .order('created_at', { ascending: sortAscending })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) {
        throw new Error(error.message || 'Failed to load providers');
      }

      return {
        data: (data || []) as Provider[],
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching pending providers:', error);
      throw error;
    }
  }

  /**
   * Get appointments list with pagination
   */
  /**
   * Get appointments list with pagination and joins
   */
  async getAppointments(
    options: PaginationOptions,
    params?: {
      search?: string;
      status?: 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled' | 'all';
      sort?: 'newest' | 'oldest' | 'date';
    }
  ): Promise<ListResponse<AppointmentDetails> | null> {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients!appointments_patient_id_fkey (
            name,
            email,
            phone_number
          ),
          providers!appointments_provider_id_fkey (
            name,
            specialty,
            phone_number
          )
        `, { count: 'exact' });

      if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      if (params?.search) {
        const safeSearch = sanitizeSearchTerm(params.search);

        if (safeSearch) {
        query = query.or(
          `location.ilike.%${safeSearch}%,notes.ilike.%${safeSearch}%`
        );
        }
      }

      const sortField = params?.sort === 'date' ? 'scheduled_date' : 'created_at';
      const sortAscending = params?.sort === 'oldest' || params?.sort === 'date';

      const { data, count, error } = await query
        .order(sortField, { ascending: sortAscending })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) {
        throw error;
      }

      const appointments = (data || []).map((apt: any) => ({
        ...apt,
        patient_name: apt.patients?.name,
        patient_email: apt.patients?.email,
        patient_phone: apt.patients?.phone_number,
        provider_name: apt.providers?.name,
        provider_specialty: apt.providers?.specialty,
        provider_phone: apt.providers?.phone_number,
      })) as AppointmentDetails[];

      return {
        data: appointments,
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching appointments:', error);
      return null;
    }
  }

  /**
   * Get appointment details by ID
   */
  async getAppointmentDetails(id: string): Promise<AppointmentDetails | null> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patients!appointments_patient_id_fkey (
            name,
            email,
            phone_number,
            date_of_birth,
            gender
          ),
          providers!appointments_provider_id_fkey (
            name,
            specialty,
            phone_number,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      // Fetch appointment-specific medical info
      const { data: medicalData } = await supabase
        .from('appointment_medical_info')
        .select('current_symptoms, medical_history, allergies, current_medications')
        .eq('appointment_id', id)
        .single();

      // Fetch patient general medical info
      const { data: patientMedicalData } = await supabase
        .from('medical_info')
        .select('allergies, conditions, medications, surgeries')
        .eq('patient_id', data.patient_id)
        .single();

      // Fetch visit notes (provider's visit record)
      const { data: visitNotesData } = await supabase
        .from('visit_notes')
        .select('id, note_text, provider_signature, created_at, updated_at')
        .eq('appointment_id', id)
        .single();

      return {
        ...data,
        patient_name: data.patients?.name,
        patient_email: data.patients?.email,
        patient_phone: data.patients?.phone_number,
        provider_name: data.providers?.name,
        provider_specialty: data.providers?.specialty,
        provider_phone: data.providers?.phone_number,
        medical_info: medicalData ? {
          current_symptoms: medicalData.current_symptoms,
          medical_history: medicalData.medical_history,
          allergies: medicalData.allergies,
          current_medications: medicalData.current_medications,
        } : undefined,
        patient_medical_info: patientMedicalData ? {
          allergies: patientMedicalData.allergies,
          conditions: patientMedicalData.conditions,
          medications: patientMedicalData.medications,
          surgeries: patientMedicalData.surgeries,
        } : undefined,
        visit_notes: visitNotesData ? {
          id: visitNotesData.id,
          note_text: visitNotesData.note_text,
          provider_signature: visitNotesData.provider_signature,
          created_at: visitNotesData.created_at,
          updated_at: visitNotesData.updated_at,
        } : undefined,
      } as AppointmentDetails;
    } catch (error) {
      console.error('Error fetching appointment details:', error);
      return null;
    }
  }

  /**
   * Get appointment location dispute evidence snapshots
   */
  async getAppointmentLocationDisputeSnapshots(
    appointmentId: string,
    bucketMinutes: number = 5
  ): Promise<AppointmentLocationDisputeSnapshot[]> {
    try {
      const normalizedBucketMinutes = [5, 10, 15].includes(bucketMinutes)
        ? bucketMinutes
        : 5;

      const { data, error } = await supabase.rpc('get_appointment_location_dispute_snapshots', {
        p_appointment_id: appointmentId,
        p_bucket_minutes: normalizedBucketMinutes,
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch appointment location evidence');
      }

      if (!Array.isArray(data)) {
        return [];
      }

      const toNullableNumber = (value: unknown): number | null => {
        if (value === null || value === undefined) return null;
        const parsed = typeof value === 'number' ? value : Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      };

      return (data as AppointmentLocationDisputeSnapshotRow[]).map((snapshot) => {
        const patientLatitude = toNullableNumber(snapshot.patient_latitude);
        const patientLongitude = toNullableNumber(snapshot.patient_longitude);
        const providerLatitude = toNullableNumber(snapshot.provider_latitude);
        const providerLongitude = toNullableNumber(snapshot.provider_longitude);

        const hasBothPoints =
          patientLatitude !== null &&
          patientLongitude !== null &&
          providerLatitude !== null &&
          providerLongitude !== null;

        return {
          timeBucket: snapshot.time_bucket,
          patient: {
            latitude: patientLatitude,
            longitude: patientLongitude,
            accuracyMeters: toNullableNumber(snapshot.patient_accuracy_meters),
            capturedAt: snapshot.patient_captured_at || null,
          },
          provider: {
            latitude: providerLatitude,
            longitude: providerLongitude,
            accuracyMeters: toNullableNumber(snapshot.provider_accuracy_meters),
            capturedAt: snapshot.provider_captured_at || null,
          },
          distanceMeters: toNullableNumber(snapshot.distance_meters),
          hasBothPoints,
        };
      });
    } catch (error) {
      console.error('Error fetching appointment location dispute snapshots:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch appointment location evidence');
    }
  }

  /**
   * Update appointment status
   */
  async updateAppointmentStatus(
    id: string,
    status: 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled',
    cancellationReason?: string
  ): Promise<Appointment | null> {
    const updates: any = { status };

    if (status === 'Completed') {
      updates.completed_at = new Date().toISOString();
    } else if (status === 'Cancelled') {
      updates.cancelled_at = new Date().toISOString();
      if (cancellationReason) {
        updates.cancellation_reason = cancellationReason;
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment status:', error);
      throw new Error(`Failed to update appointment status: ${error.message}`);
    }

    return data as Appointment;
  }

  /**
   * Cancel appointment with wallet refund
   */
  async cancelAppointmentWithRefund(
    id: string,
    refundPercentage: number,
    cancellationReason?: string
  ): Promise<{
    success: boolean;
    refundAmount?: number;
    deductionAmount?: number;
    providerCreditAmount?: number;
    platformFeeAmount?: number;
    refundPercentage?: number;
    breakdown?: string;
    message?: string;
    error?: string;
  }> {
    const normalizedRefundPercentage = Number.isFinite(refundPercentage)
      ? Math.min(100, Math.max(0, Number(refundPercentage.toFixed(2))))
      : 100;

    const { data, error } = await supabase.rpc('admin_cancel_appointment', {
      appointment_id_param: id,
      cancellation_reason_param: cancellationReason ?? null,
      refund_percentage_param: normalizedRefundPercentage,
    });

    if (error) {
      console.error('Error cancelling appointment with refund:', error);
      throw new Error(`Failed to cancel appointment: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to cancel appointment');
    }

    return data as {
      success: boolean;
      refundAmount?: number;
      deductionAmount?: number;
      providerCreditAmount?: number;
      platformFeeAmount?: number;
      refundPercentage?: number;
      breakdown?: string;
      message?: string;
      error?: string;
    };
  }

  /**
   * Get a single patient by ID
   */
  async getPatientById(id: string): Promise<Patient | null> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return (data || null) as Patient | null;
    } catch (error) {
      console.error('Error fetching patient:', error);
      return null;
    }
  }

  /**
   * Get patient with related details
   */
  async getPatientDetails(id: string): Promise<PatientDetails | null> {
    try {
      const { data: secureData, error: secureError } = await supabase.functions.invoke('get-verification-details', {
        body: { entity: 'patient', id },
      });

      if (!secureError && secureData) {
        return secureData as PatientDetails;
      }

      const { data, error } = await supabase
        .from('patients')
        .select(
          `*,
          patient_addresses(*),
          emergency_contacts(*),
          medical_info(*)`
        )
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to load patient details');
      }

      if (!data) {
        return null;
      }

      const normalized = {
        ...data,
        medical_info: Array.isArray(data.medical_info)
          ? data.medical_info[0] || null
          : data.medical_info || null,
      };

      let patientDocuments: PatientDocument[] = [];

      const extractPatientDocumentsFromRecord = (record: Record<string, unknown>): PatientDocument[] => {
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

        return candidateKeys
          .filter((key) => typeof record[key] === 'string' && (record[key] as string).trim().length > 0)
          .map((key) => ({
            id: `${key}-${id}`,
            patient_id: id,
            document_type: key.replace(/_url$/, ''),
            storage_path: String(record[key]),
            verification_status: (record.verification_status as 'pending' | 'approved' | 'rejected') || 'pending',
            submitted_at: String(record.updated_at || record.created_at || new Date().toISOString()),
          }));
      };

      const { data: docsData, error: docsError } = await supabase
        .from('patient_documents')
        .select('*')
        .eq('patient_id', id)
        .order('created_at', { ascending: false });

      if (!docsError && docsData) {
        patientDocuments = docsData as PatientDocument[];
      }

      if (patientDocuments.length === 0) {
        const { data: altDocsData, error: altDocsError } = await supabase
          .from('patient_verification_documents')
          .select('*')
          .eq('patient_id', id)
          .order('created_at', { ascending: false });

        if (!altDocsError && altDocsData) {
          patientDocuments = altDocsData as PatientDocument[];
        }
      }

      if (patientDocuments.length === 0) {
        patientDocuments = extractPatientDocumentsFromRecord(normalized as Record<string, unknown>);
      }

      if (patientDocuments.length === 0 && normalized.profile_image_url) {
        patientDocuments = [
          {
            id: `profile-image-${id}`,
            patient_id: id,
            document_type: 'profile_image',
            storage_path: normalized.profile_image_url,
            verification_status: normalized.verification_status,
            submitted_at: normalized.updated_at || normalized.created_at,
          },
        ];
      }

      return {
        ...(normalized as PatientDetails),
        patient_documents: patientDocuments,
      };
    } catch (error) {
      console.error('Error fetching patient details:', error);
      return null;
    }
  }

  /**
   * Create signed URL for patient document preview
   */
  async getPatientDocumentSignedUrl(storagePath: string): Promise<string | null> {
    try {
      if (/^https?:\/\//i.test(storagePath)) {
        return storagePath;
      }

      const buildPath = (bucketPrefix: string) => storagePath.replace(new RegExp(`^${bucketPrefix}\/`), '');

      const trySignedUrl = async (bucket: string, path: string) => {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
        if (error || !data?.signedUrl) return null;
        return data.signedUrl;
      };

      const preferredBucket = storagePath.startsWith('patient-documents/') ? 'patient-documents' : 'patient-documents';
      const preferredPath = buildPath(preferredBucket);

      const preferredUrl = await trySignedUrl(preferredBucket, preferredPath);
      if (preferredUrl) return preferredUrl;

      const fallbackProviderPath = buildPath('provider-documents');
      const providerFallbackUrl = await trySignedUrl('provider-documents', fallbackProviderPath);
      if (providerFallbackUrl) return providerFallbackUrl;

      throw new Error('No signed URL returned from storage');
    } catch (error) {
      console.error('Error creating patient document signed URL:', error);
      return null;
    }
  }

  /**
   * Update patient verification status
   */
  async updatePatientStatus(
    id: string,
    status: 'approved' | 'rejected' | 'pending'
  ): Promise<Patient | null> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .update({ verification_status: status })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update patient status');
      }

      return (data || null) as Patient | null;
    } catch (error) {
      console.error('Error updating patient status:', error);
      throw error;
    }
  }

  /**
   * Get a single provider by ID
   */
  async getProviderById(id: string): Promise<Provider | null> {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return (data || null) as Provider | null;
    } catch (error) {
      console.error('Error fetching provider:', error);
      return null;
    }
  }

  /**
   * Get provider details with documents
   */
  async getProviderDetails(id: string): Promise<ProviderDetails | null> {
    try {
      const { data: secureData, error: secureError } = await supabase.functions.invoke('get-verification-details', {
        body: { entity: 'provider', id },
      });

      if (!secureError && secureData) {
        return secureData as ProviderDetails;
      }

      const { data, error } = await supabase
        .from('providers')
        .select('*, provider_documents(*)')
        .eq('id', id)
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to load provider details');
      }

      return (data || null) as ProviderDetails | null;
    } catch (error) {
      console.error('Error fetching provider details:', error);
      return null;
    }
  }

  /**
   * Update provider account status
   */
  async updateProviderStatus(
    id: string,
    status: 'approved' | 'rejected' | 'pending' | 'document_pending' | 'pending_approval'
  ): Promise<Provider | null> {
    try {
      const updates = {
        account_status: status,
        is_verified: status === 'approved',
      };

      const { data, error } = await supabase
        .from('providers')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update provider status');
      }

      return (data || null) as Provider | null;
    } catch (error) {
      console.error('Error updating provider status:', error);
      throw error;
    }
  }

  /**
   * Update provider document status
   */
  async updateProviderDocumentStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<ProviderDocument | null> {
    try {
      const { data, error } = await supabase
        .from('provider_documents')
        .update({ verification_status: status, reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update document status');
      }

      return (data || null) as ProviderDocument | null;
    } catch (error) {
      console.error('Error updating provider document status:', error);
      throw error;
    }
  }

  /**
   * Create signed URL for provider document preview
   */
  async getProviderDocumentSignedUrl(storagePath: string): Promise<string | null> {
    try {
      // Remove bucket prefix if present
      const normalizedPath = storagePath.replace(/^provider-documents\//, '');

      const { data, error } = await supabase.storage
        .from('provider-documents')
        .createSignedUrl(normalizedPath, 60 * 10);

      if (error) {
        throw new Error(error.message || 'Failed to create signed URL');
      }

      if (!data?.signedUrl) {
        throw new Error('No signed URL returned from storage');
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
  }

  /**
   * Suspend a patient account
   */
  async suspendPatientAccount(id: string): Promise<Patient | null> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .update({ is_active: false })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to suspend patient account');
      }

      return (data || null) as Patient | null;
    } catch (error) {
      console.error('Error suspending patient account:', error);
      throw error;
    }
  }

  /**
   * Reactivate a patient account
   */
  async reactivatePatientAccount(id: string): Promise<Patient | null> {
    try {
      const { data, error } = await supabase
        .from('patients')
        .update({ is_active: true })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to reactivate patient account');
      }

      return (data || null) as Patient | null;
    } catch (error) {
      console.error('Error reactivating patient account:', error);
      throw error;
    }
  }

  /**
   * Suspend a provider account
   */
  async suspendProviderAccount(id: string): Promise<Provider | null> {
    try {
      const { data, error } = await supabase
        .from('providers')
        .update({ is_active: false })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to suspend provider account');
      }

      return (data || null) as Provider | null;
    } catch (error) {
      console.error('Error suspending provider account:', error);
      throw error;
    }
  }

  /**
   * Reactivate a provider account
   */
  async reactivateProviderAccount(id: string): Promise<Provider | null> {
    try {
      const { data, error } = await supabase
        .from('providers')
        .update({ is_active: true })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to reactivate provider account');
      }

      return (data || null) as Provider | null;
    } catch (error) {
      console.error('Error reactivating provider account:', error);
      throw error;
    }
  }

  /**
   * Get financial metrics
   */
  async getFinancialMetrics(): Promise<FinancialMetrics | null> {
    try {
      const parseNumeric = (value: unknown): number => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') {
          const parsed = Number.parseFloat(value);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      };

      // Get patient wallet balance
      const { data: patientWallets, error: patientWalletError } = await supabase
        .from('patient_wallet')
        .select('balance');

      if (patientWalletError) {
        console.error('Patient wallet error:', patientWalletError);
        throw patientWalletError;
      }

      const patientWalletBalance = (patientWallets || [])
        .reduce((sum, w) => sum + (w.balance || 0), 0);

      // Get provider wallet balance
      const { data: providerWallets, error: providerWalletError } = await supabase
        .from('provider_wallets')
        .select('balance');

      if (providerWalletError) {
        console.error('Provider wallet error:', providerWalletError);
        throw providerWalletError;
      }

      const providerWalletBalance = (providerWallets || [])
        .reduce((sum, w) => sum + (w.balance || 0), 0);

      // Get platform revenue from platform_revenue_logs
      const { data: revenueLogs, error: revenueError } = await supabase
        .from('platform_revenue_logs')
        .select('amount, revenue_type');

      if (revenueError) {
        console.error('Platform revenue error:', revenueError);
        throw revenueError;
      }

      console.log('Platform revenue logs fetched:', revenueLogs?.length || 0, 'records');
      console.log('Revenue logs data:', revenueLogs);

      const platformCommissions = (revenueLogs || [])
        .filter((log) => log.revenue_type === 'appointment_commission')
        .reduce((sum, log) => sum + parseNumeric(log.amount), 0);

      const platformCancellationFees = (revenueLogs || [])
        .filter((log) => log.revenue_type === 'cancellation_fee')
        .reduce((sum, log) => sum + parseNumeric(log.amount), 0);

      const platformRevenue = platformCommissions + platformCancellationFees;

      // Get pending payouts from provider_withdrawals table
      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('provider_withdrawals')
        .select('amount')
        .eq('status', 'Pending');

      if (withdrawalError) {
        console.error('Withdrawals error:', withdrawalError);
        throw withdrawalError;
      }

      const pendingPayouts = (withdrawals || [])
        .reduce((sum, w) => sum + parseFloat(w.amount || '0'), 0);

      // Get total top up revenue (all-time)
      const { data: topups, error: topupError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'topup')
        .eq('status', 'completed');

      if (topupError) {
        console.error('Top-ups error:', topupError);
        throw topupError;
      }

      const totalTopUpRevenue = (topups || [])
        .reduce((sum, t) => sum + parseNumeric(t.amount), 0);

      // Financial metrics calculated successfully

      return {
        patientWalletBalance,
        providerWalletBalance,
        platformRevenue,
        platformCommissions,
        platformCancellationFees,
        pendingPayouts,
        totalTopUpRevenue,
      };
    } catch (error) {
      console.error('Error fetching financial metrics:', error);
      return null;
    }
  }

  /**
   * Get transactions with pagination
   */
  async getTransactions(
    options: PaginationOptions,
    params?: {
      search?: string;
      type?: 'topup' | 'payment' | 'refund' | 'withdrawal' | 'all';
      status?: 'completed' | 'pending' | 'failed' | 'all';
    }
  ): Promise<ListResponse<TransactionRecord> | null> {
    try {
      // Fetch patient transactions
      let patientQuery = supabase
        .from('transactions')
        .select(`
          *,
          patients!transactions_patient_id_fkey (
            name
          ),
          providers!transactions_provider_id_fkey (
            name
          )
        `, { count: 'exact' });

      if (params?.type && params.type !== 'all') {
        patientQuery = patientQuery.eq('type', params.type);
      }

      if (params?.status && params.status !== 'all') {
        patientQuery = patientQuery.eq('status', params.status);
      }

      if (params?.search) {
        const safeSearch = sanitizeSearchTerm(params.search);
        if (safeSearch) {
          patientQuery = patientQuery.or(`reference.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
        }
      }

      // Fetch provider transaction logs
      const { data: providerLogs, error: providerError } = await supabase
        .from('provider_transaction_logs')
        .select(`
          *,
          providers!provider_transaction_logs_provider_id_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (providerError) {
        console.error('Error fetching provider logs:', providerError);
      }

      const { data: patientData, error } = await patientQuery
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map patient transactions
      const patientTransactions = (patientData || []).map((tx: any) => ({
        id: tx.id,
        patient_id: tx.patient_id,
        patient_name: tx.patients?.name,
        type: tx.type,
        amount: parseFloat(tx.amount),
        description: tx.description,
        status: tx.status,
        reference: tx.reference,
        payment_method: tx.payment_method,
        provider_id: tx.provider_id,
        provider_name: tx.providers?.name,
        created_at: tx.created_at,
      })) as TransactionRecord[];

      // Map provider transaction logs to TransactionRecord format
      const providerTransactions = (providerLogs || []).map((log: any) => ({
        id: log.id,
        patient_id: '', // Provider logs don't have patient_id
        patient_name: undefined,
        type: log.transaction_type === 'credit' ? 'payment' : log.transaction_type === 'debit' ? 'withdrawal' : 'refund',
        amount: parseFloat(log.amount),
        description: log.description || `${log.transaction_type} transaction`,
        status: 'completed' as const,
        reference: log.related_withdrawal_id || log.related_appointment_id,
        payment_method: undefined,
        provider_id: log.provider_id,
        provider_name: log.providers?.name,
        created_at: log.created_at,
      })) as TransactionRecord[];

      // Merge and sort all transactions by created_at
      const allTransactions = [...patientTransactions, ...providerTransactions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Apply pagination to merged results
      const startIndex = (options.page - 1) * options.pageSize;
      const endIndex = startIndex + options.pageSize;
      const paginatedTransactions = allTransactions.slice(startIndex, endIndex);

      return {
        data: paginatedTransactions,
        total: allTransactions.length,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return null;
    }
  }

  /**
   * Get provider payouts (withdrawal requests) with pagination
   */
  async getProviderPayouts(
    options: PaginationOptions,
    params?: {
      status?: 'pending' | 'processing' | 'completed' | 'failed' | 'all';
      provider_id?: string;
    }
  ): Promise<ListResponse<ProviderPayout> | null> {
    try {
      let query = supabase
        .from('provider_withdrawals')
        .select(`
          id,
          provider_id,
          amount,
          status,
          requested_at,
          processed_at,
          payout_method_id,
          admin_note,
          providers!provider_withdrawals_provider_id_fkey (
            name
          ),
          provider_payout_methods (
            id,
            method_type,
            account_name,
            account_number,
            bank_code,
            bank_name
          )
        `, { count: 'exact' });

      // Map status values: 'Pending' -> 'pending', 'Paid' -> 'completed'
      if (params?.status && params.status !== 'all') {
        const dbStatus = params.status === 'completed' ? 'Paid' : 
                         params.status === 'pending' ? 'Pending' :
                         params.status;
        query = query.ilike('status', dbStatus);
      }

      if (params?.provider_id) {
        query = query.eq('provider_id', params.provider_id);
      }

      const { data, count, error } = await query
        .order('requested_at', { ascending: false })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) throw error;

      const payouts: ProviderPayout[] = (data || []).map((withdrawal: any) => ({
        id: withdrawal.id,
        provider_id: withdrawal.provider_id,
        provider_name: withdrawal.providers?.[0]?.name || withdrawal.providers?.name,
        payout_method_id: withdrawal.payout_method_id,
        payout_method: withdrawal.provider_payout_methods?.[0] || withdrawal.provider_payout_methods,
        amount: parseFloat(withdrawal.amount),
        status: withdrawal.status === 'Paid' ? 'completed' : 
                withdrawal.status === 'Pending' ? 'pending' : 'pending',
        reference: withdrawal.admin_note,
        created_at: withdrawal.requested_at,
        completed_at: withdrawal.processed_at,
      }));

      return {
        data: payouts,
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching provider withdrawals:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
      }
      return null;
    }
  }

  /**
   * Get platform revenue logs with pagination
   */
  async getPlatformRevenueLogs(
    options: PaginationOptions,
    params?: {
      revenue_type?: 'appointment_commission' | 'cancellation_fee' | 'all';
    }
  ): Promise<ListResponse<PlatformRevenueLog> | null> {
    try {
      const parseNumeric = (value: unknown): number => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') {
          const parsed = Number.parseFloat(value);
          return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
      };

      let query = supabase
        .from('platform_revenue_logs')
        .select('*', { count: 'exact' });

      if (params?.revenue_type && params.revenue_type !== 'all') {
        query = query.eq('revenue_type', params.revenue_type);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) throw error;

      const logs: PlatformRevenueLog[] = (data || []).map((log: any) => ({
        id: log.id,
        revenue_type: log.revenue_type,
        amount: parseNumeric(log.amount),
        related_appointment_id: log.related_appointment_id || '',
        description: log.description,
        created_at: log.created_at,
      }));

      return {
        data: logs,
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching platform revenue logs:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
      }
      return null;
    }
  }

  /**
   * Get support messages with pagination and filters
   */
  async getSupportMessages(
    options: PaginationOptions,
    params?: {
      search?: string;
      status?: string;
      category?: string;
      priority?: string;
    }
  ): Promise<ListResponse<SupportMessageDetails> | null> {
    try {
      let query = supabase
        .from('messages')
        .select(`
          *,
          admin_users!messages_responded_by_fkey (
            name,
            email
          )
        `, { count: 'exact' });

      // Search across sender info, subject, message
      if (params?.search) {
        const safeSearch = sanitizeSearchTerm(params.search);
        query = query.or(`name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%,subject.ilike.%${safeSearch}%,message.ilike.%${safeSearch}%`);
      }

      // Filter by status
      if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      // Filter by category
      if (params?.category && params.category !== 'all') {
        query = query.eq('category', params.category);
      }

      // Filter by priority
      if (params?.priority && params.priority !== 'all') {
        query = query.eq('priority', params.priority);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) throw error;

      const messages: SupportMessageDetails[] = (data || []).map((msg: any) => ({
        ...msg,
        responded_by_name: msg.admin_users?.name,
        responded_by_email: msg.admin_users?.email,
      }));

      return {
        data: messages,
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching support messages:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
      }
      return null;
    }
  }

  /**
   * Get single support message details
   */
  async getSupportMessage(id: number): Promise<SupportMessageDetails | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          admin_users!messages_responded_by_fkey (
            name,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return {
        ...data,
        responded_by_name: data.admin_users?.name,
        responded_by_email: data.admin_users?.email,
      };
    } catch (error) {
      console.error('Error fetching support message:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
      }
      return null;
    }
  }

  /**
   * Respond to support message
   */
  async respondToSupportMessage(
    id: number,
    response: string,
    newStatus?: 'in_progress' | 'responded' | 'resolved'
  ): Promise<SupportMessage | null> {
    try {
      // Get current auth user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get admin user record
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (adminError || !adminUser) throw new Error('Not authorized');

      const { data, error } = await supabase
        .from('messages')
        .update({
          admin_response: response,
          responded_by: adminUser.id,
          responded_at: new Date().toISOString(),
          status: newStatus || 'responded',
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error responding to support message:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
      }
      return null;
    }
  }

  /**
   * Update support message status
   */
  async updateSupportMessageStatus(
    id: number,
    status: 'new' | 'in_progress' | 'responded' | 'resolved' | 'closed'
  ): Promise<SupportMessage | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating support message status:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
      }
      return null;
    }
  }

  /**
   * Update support message priority/category
   */
  async updateSupportMessageFields(
    id: number,
    fields: {
      priority?: 'low' | 'normal' | 'high' | 'urgent';
      category?: 'general' | 'technical' | 'billing' | 'appointment' | 'complaint' | 'feedback';
    }
  ): Promise<SupportMessage | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .update(fields)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating support message fields:', error);
      if (error instanceof Error) {
        console.error('Details:', error.message);
      }
      return null;
    }
  }

  /**
   * Update payout status
   */
  async updatePayoutStatus(
    payoutId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<ProviderPayout | null> {
    try {
      // Map status from API format to database format
      const dbStatus = status === 'completed' ? 'Paid' : 
                       status === 'pending' ? 'Pending' :
                       status === 'processing' ? 'Pending' : 'Pending';

      // Call the SECURITY DEFINER function to bypass RLS
      const { data: procedureResult, error: procedureError } = await supabase
        .rpc('mark_withdrawal_as_paid', {
          p_withdrawal_id: payoutId,
          p_new_status: dbStatus
        });

      if (procedureError) {
        console.error('❌ Error calling stored procedure:', procedureError);
        throw procedureError;
      }

      if (!procedureResult || procedureResult.length === 0) {
        console.error('❌ No data returned from procedure');
        throw new Error('No data returned from update procedure');
      }

      // Fetch the full payout record with all relationships
      const { data: fullData, error: fetchError } = await supabase
        .from('provider_withdrawals')
        .select(`
          id,
          provider_id,
          amount,
          status,
          requested_at,
          processed_at,
          payout_method_id,
          admin_note,
          providers!provider_withdrawals_provider_id_fkey (
            name
          ),
          provider_payout_methods (
            id,
            method_type,
            account_name,
            account_number,
            bank_code,
            bank_name
          )
        `)
        .eq('id', payoutId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching updated withdrawal:', fetchError);
        throw fetchError;
      }

      const payout: ProviderPayout = {
        id: fullData.id,
        provider_id: fullData.provider_id,
        provider_name: (fullData.providers as any)?.[0]?.name || (fullData.providers as any)?.name,
        payout_method_id: fullData.payout_method_id,
        payout_method: (fullData.provider_payout_methods as any)?.[0] || (fullData.provider_payout_methods as any),
        amount: parseFloat(fullData.amount),
        status: fullData.status === 'Paid' ? 'completed' : 
                fullData.status === 'Pending' ? 'pending' : 'pending',
        reference: fullData.admin_note,
        created_at: fullData.requested_at,
        completed_at: fullData.processed_at,
      };
      return payout;
    } catch (error) {
      console.error('❌ Error updating withdrawal status:', error);
      throw error;
    }
  }

  /**
   * Get appointments by service type
   */
  async getAppointmentsByService(): Promise<AppointmentsByService[] | null> {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('service_type, status');

    if (error) throw error;

    const filtered = (appointments || [])
      .filter(apt => apt.status === 'Completed');

    const serviceTypeCounts = filtered
      .reduce((acc: Record<string, number>, apt) => {
        acc[apt.service_type] = (acc[apt.service_type] || 0) + 1;
        return acc;
      }, {});

    const total = Object.values(serviceTypeCounts).reduce((sum, count) => sum + count, 0);

    // Calculate percentages ensuring they add up to 100
    const entries = Object.entries(serviceTypeCounts);
    const result = entries.map(([serviceType, count], index) => {
      // For the last item, use remainder to ensure total = 100
      const percentage = index === entries.length - 1
        ? 100 - entries.slice(0, -1).reduce((sum, [_, c]) => sum + Math.floor((c / total) * 100), 0)
        : Math.floor((count / total) * 100);

      return {
        serviceType,
        count,
        percentage: total > 0 ? Math.max(1, percentage) : 0, // Ensure at least 1% visibility
      };
    });

    return result;
  }

  /**
   * Get top locations by appointment count and revenue
   */
  async getTopLocations(limit: number = 10): Promise<LocationAnalytics[] | null> {
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        total_cost,
        status,
        patient_id,
        patients(
          id,
          patient_addresses(
            state
          )
        )
      `);

    if (appointmentError) throw appointmentError;

    const locationStats = (appointments || [])
      .filter(apt => {
        // Handle case where patients might be array or object
        const patientData = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients;
        return apt.status === 'Completed' && 
               patientData &&
               patientData.patient_addresses &&
               Array.isArray(patientData.patient_addresses) &&
               patientData.patient_addresses.length > 0;
      })
      .reduce((acc: Record<string, { count: number; revenue: number }>, apt) => {
        // Handle case where patients might be array or object
        const patientData = Array.isArray(apt.patients) ? apt.patients[0] : apt.patients;
        const state = patientData?.patient_addresses?.[0]?.state;
        if (!state) return acc;

        if (!acc[state]) {
          acc[state] = { count: 0, revenue: 0 };
        }
        acc[state].count += 1;
        acc[state].revenue += apt.total_cost ? parseFloat(apt.total_cost.toString()) : 0;
        return acc;
      }, {});

    return Object.entries(locationStats)
      .map(([location, stats]) => ({
        location,
        appointmentCount: stats.count,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, limit);
  }

  /**
   * Get top earning providers
   */
  async getTopEarningProviders(limit: number = 10): Promise<ProviderEarnings[] | null> {
    const { data: appointments, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        provider_id,
        total_cost,
        status,
        providers(
          name
        )
      `)
      .eq('status', 'Completed');

    if (appointmentError) throw appointmentError;

    const providerStats = (appointments || [])
      .reduce((acc: Record<string, { name: string; earnings: number; count: number }>, apt) => {
        if (!acc[apt.provider_id]) {
          const providerData = Array.isArray(apt.providers) ? apt.providers[0] : apt.providers;
          acc[apt.provider_id] = {
            name: (providerData && typeof providerData === 'object' && providerData.name) || 'Unknown',
            earnings: 0,
            count: 0,
          };
        }
        acc[apt.provider_id].earnings += apt.total_cost ? parseFloat(apt.total_cost.toString()) : 0;
        acc[apt.provider_id].count += 1;
        return acc;
      }, {});

    return Object.entries(providerStats)
      .map(([providerId, stats]) => ({
        providerId,
        providerName: stats.name,
        totalEarnings: stats.earnings,
        appointmentCount: stats.count,
        averageEarnings: stats.count > 0 ? Math.round(stats.earnings / stats.count) : 0,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  /**
   * Get top providers by rating
   */
  async getTopProvidersByRating(limit: number = 10): Promise<ProviderRating[] | null> {
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select(`
        provider_id,
        rating,
        providers(
          name
        )
      `);

    if (reviewError) throw reviewError;

    const providerRatings = (reviews || [])
      .reduce((acc: Record<string, { name: string; totalRating: number; count: number }>, review) => {
        if (!acc[review.provider_id]) {
          const providerData = Array.isArray(review.providers) ? review.providers[0] : review.providers;
          acc[review.provider_id] = {
            name: (providerData && typeof providerData === 'object' && providerData.name) || 'Unknown',
            totalRating: 0,
            count: 0,
          };
        }
        acc[review.provider_id].totalRating += review.rating || 0;
        acc[review.provider_id].count += 1;
        return acc;
      }, {});

    return Object.entries(providerRatings)
      .map(([providerId, stats]) => ({
        providerId,
        providerName: stats.name,
        averageRating: stats.count > 0 ? parseFloat((stats.totalRating / stats.count).toFixed(2)) : 0,
        totalReviews: stats.count,
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, limit);
  }

  /**
   * Get appointment trends
   */
  async getAppointmentTrends(): Promise<AnalyticsMetrics['appointmentTrends'] | null> {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('scheduled_date, total_cost, status')
      .eq('status', 'Completed');

    if (error) throw error;

    // Daily trends
    const dailyStats = (appointments || [])
      .reduce((acc: Record<string, { count: number; revenue: number }>, apt) => {
        const date = apt.scheduled_date;
        if (!acc[date]) {
          acc[date] = { count: 0, revenue: 0 };
        }
        acc[date].count += 1;
        acc[date].revenue += apt.total_cost ? parseFloat(apt.total_cost.toString()) : 0;
        return acc;
      }, {});

    const daily: AppointmentTrendData[] = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        appointments: stats.count,
        revenue: Math.round(stats.revenue),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Weekly trends
    const weeklyStats: Record<string, { count: number; revenue: number }> = {};
    (appointments || []).forEach(apt => {
      const date = new Date(apt.scheduled_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyStats[weekKey]) {
        weeklyStats[weekKey] = { count: 0, revenue: 0 };
      }
      weeklyStats[weekKey].count += 1;
      weeklyStats[weekKey].revenue += apt.total_cost ? parseFloat(apt.total_cost.toString()) : 0;
    });

    const weekly: AppointmentTrendData[] = Object.entries(weeklyStats)
      .map(([date, stats]) => ({
        date,
        appointments: stats.count,
        revenue: Math.round(stats.revenue),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Monthly trends
    const monthlyStats: Record<string, { count: number; revenue: number }> = {};
    (appointments || []).forEach(apt => {
      const date = new Date(apt.scheduled_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { count: 0, revenue: 0 };
      }
      monthlyStats[monthKey].count += 1;
      monthlyStats[monthKey].revenue += apt.total_cost ? parseFloat(apt.total_cost.toString()) : 0;
    });

    const monthly: AppointmentTrendData[] = Object.entries(monthlyStats)
      .map(([date, stats]) => ({
        date: `${date}-01`,
        appointments: stats.count,
        revenue: Math.round(stats.revenue),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      daily,
      weekly,
      monthly,
    };
  }

  /**
   * Get all analytics metrics
   */
  async getAnalyticsMetrics(): Promise<AnalyticsMetrics | null> {
    try {
      const results = await Promise.allSettled([
        this.getAppointmentsByService(),
        this.getTopLocations(),
        this.getTopEarningProviders(),
        this.getTopProvidersByRating(),
        this.getAppointmentTrends(),
      ]);

      const [
        appointmentsByServiceResult,
        topLocationsResult,
        topEarningProvidersResult,
        topProvidersByRatingResult,
        appointmentTrendsResult,
      ] = results;

      // Log any rejections for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Analytics function ${index} failed:`, result.reason);
        }
      });

      return {
        appointmentsByService: appointmentsByServiceResult.status === 'fulfilled' ? (appointmentsByServiceResult.value || []) : [],
        topLocations: topLocationsResult.status === 'fulfilled' ? (topLocationsResult.value || []) : [],
        topEarningProviders: topEarningProvidersResult.status === 'fulfilled' ? (topEarningProvidersResult.value || []) : [],
        topProvidersByRating: topProvidersByRatingResult.status === 'fulfilled' ? (topProvidersByRatingResult.value || []) : [],
        appointmentTrends: appointmentTrendsResult.status === 'fulfilled' ? (appointmentTrendsResult.value || { daily: [], weekly: [], monthly: [] }) : { daily: [], weekly: [], monthly: [] },
      };
    } catch (error) {
      console.error('Error fetching analytics metrics:', error);
      return null;
    }
  }

  /**
   * Get all admin users
   */
  async getAdminUsers(): Promise<AdminUserSettings[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('list-admin-users');

      if (error) {
        const status = error.context?.status;
        const message = error.message?.toLowerCase() || '';

        if (status === 403 || message.includes('403') || message.includes('forbidden') || message.includes('origin')) {
          throw new Error('Admin users request blocked. Configure Edge Function ALLOWED_ORIGINS to include your frontend domain.');
        }

        if (status === 404 || message.includes('404') || message.includes('not found')) {
          throw new Error('Admin users function not found. Deploy Supabase Edge Function: list-admin-users.');
        }

        if (status === 500 || message.includes('500') || message.includes('server misconfiguration')) {
          throw new Error('Admin users function misconfigured. Set SERVICE_ROLE_KEY in Supabase Edge Function secrets.');
        }

        throw new Error(error.message || 'Failed to fetch admin users');
      }

      if (!data) return [];

      if (data.error) throw new Error(data.error);

      return data as AdminUserSettings[];
    } catch (error) {
      console.error('Error fetching admin users:', error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error('Failed to fetch admin users');
    }
  }

  /**
   * Create a new admin user
   */
  async createAdminUser(userData: {
    email: string;
    password: string;
    name: string;
    role: 'super_admin' | 'admin' | 'moderator';
  }): Promise<AdminUserSettings | null> {
    try {
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to create admin user');
      }

      if (!data) {
        throw new Error('No response from server');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as AdminUserSettings;
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw error;
    }
  }

  /**
   * Update an admin user
   */
  async updateAdminUser(
    id: string,
    updates: Partial<Pick<AdminUserSettings, 'name' | 'role' | 'is_active'>>
  ): Promise<AdminUserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        auth_id: data.auth_id,
        email: data.email,
        name: data.name,
        role: data.role,
        is_active: data.is_active,
        last_login_at: data.last_login_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error('Error updating admin user:', error);
      return null;
    }
  }

  /**
   * Toggle admin user active status
   */
  async toggleAdminStatus(id: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error toggling admin status:', error);
      return false;
    }
  }

  /**
   * Get admin user activity audit logs
   */
  async getAdminAuditLogs(limit: number = 100, tableFilter?: string): Promise<AuditLog[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('list-audit-logs', {
        body: {
          limit,
          tableFilter: tableFilter || null,
        },
      });

      if (error) {
        const message = error.message?.toLowerCase() || '';

        if (message.includes('403') || message.includes('forbidden')) {
          throw new Error('Audit logs access denied. Super admin access is required.');
        }

        if (message.includes('404') || message.includes('not found')) {
          throw new Error('Audit logs function not found. Deploy Supabase Edge Function: list-audit-logs.');
        }

        if (message.includes('500') || message.includes('server misconfiguration')) {
          throw new Error('Audit logs function misconfigured. Check Edge Function secrets.');
        }

        throw new Error(error.message || 'Failed to fetch audit logs');
      }

      if (!data) return [];

      return data as AuditLog[];
    } catch (error) {
      console.error('Error fetching admin audit logs:', error);
      return null;
    }
  }

  /**
   * Get platform configuration (simulated - would come from settings table)
   */
  async getPlatformConfig(): Promise<PlatformConfiguration | null> {
    try {
      // For now, return default configuration
      // In a real app, this would fetch from a platform_settings table
      return {
        commissionRate: 20, // 20%
        platformFee: 0,
        maxAppointmentDays: 90,
        minAppointmentNotice: 24, // 24 hours
      };
    } catch (error) {
      console.error('Error fetching platform config:', error);
      return null;
    }
  }

  /**
   * Update platform configuration
   */
  async updatePlatformConfig(_config: Partial<PlatformConfiguration>): Promise<PlatformConfiguration | null> {
    try {
      // In a real app, this would update the platform_settings table
      return await this.getPlatformConfig();
    } catch (error) {
      console.error('Error updating platform config:', error);
      return null;
    }
  }

  /**
   * Get service types from service_categories table
   */
  async getServiceTypes(): Promise<ServiceTypeConfig[] | null> {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Map database fields to ServiceTypeConfig
      return (data || []).map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        minRate: category.min_rate || 0,
        maxRate: category.max_rate || 0,
        duration: category.duration || '60 mins',
        color: category.color,
        icon: category.icon,
        isActive: true, // service_categories doesn't have is_active field, always true
        createdAt: category.created_at,
      }));
    } catch (error) {
      console.error('Error fetching service types:', error);
      return null;
    }
  }

  /**
   * Update a service type
   */
  async updateServiceType(
    id: string,
    updates: {
      name?: string;
      description?: string;
      min_rate?: number;
      max_rate?: number;
      duration?: string;
      color?: string;
      icon?: string;
    }
  ): Promise<ServiceTypeConfig | null> {
    try {
      const { data, error } = await supabase
        .from('service_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        minRate: data.min_rate || 0,
        maxRate: data.max_rate || 0,
        duration: data.duration || '60 mins',
        color: data.color,
        icon: data.icon,
        isActive: true,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Error updating service type:', error);
      return null;
    }
  }

  /**
   * Get appointment statuses
   */
  async getAppointmentStatuses(): Promise<AppointmentStatusConfig[] | null> {
    try {
      const statuses = [
        { id: '1', status: 'Requested', displayName: 'Requested', description: 'Appointment requested by patient', color: 'blue', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '2', status: 'Scheduled', displayName: 'Scheduled', description: 'Appointment scheduled', color: 'amber', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '3', status: 'Completed', displayName: 'Completed', description: 'Appointment completed', color: 'emerald', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: '4', status: 'Cancelled', displayName: 'Cancelled', description: 'Appointment cancelled', color: 'red', isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ];
      return statuses;
    } catch (error) {
      console.error('Error fetching appointment statuses:', error);
      return null;
    }
  }

  // ===== BROADCAST NOTIFICATIONS =====

  async getBroadcastNotifications(
    options: PaginationOptions,
    params?: { status?: 'draft' | 'scheduled' | 'sent' | 'all' }
  ): Promise<ListResponse<any> | null> {
    try {
      let query = supabase
        .from('broadcast_notifications')
        .select('*', { count: 'exact' });

      if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching broadcast notifications:', error);
      return null;
    }
  }

  async createBroadcastNotification(
    data: any,
    options?: { saveAsDraft?: boolean }
  ): Promise<any | null> {
    try {
      if (options?.saveAsDraft) {
        const { data: draftNotification, error: draftError } = await supabase
          .from('broadcast_notifications')
          .insert({
            title: data.title,
            message: data.message,
            recipient_type: data.recipient_type,
            status: 'draft',
            scheduled_at: data.scheduled_at || null,
          })
          .select('*')
          .single();

        if (draftError) {
          console.error('Error creating draft notification:', draftError);
          throw draftError;
        }

        return draftNotification;
      }

      const requestTime = new Date().toISOString();
      const { data: notificationId, error } = await supabase.rpc(
        'create_broadcast_notification_v2',
        {
          p_title: data.title,
          p_message: data.message,
          p_recipient_type: data.recipient_type,
          p_scheduled_at: data.scheduled_at || null,
        }
      );

      if (error) {
        console.error('RPC error details:', error);
        throw error;
      }

      let createdNotificationId: string | null = null;

      if (typeof notificationId === 'string') {
        createdNotificationId = notificationId;
      } else if (Array.isArray(notificationId)) {
        const firstItem = notificationId[0] as
          | string
          | { id?: string; create_broadcast_notification_v2?: string }
          | undefined;

        if (typeof firstItem === 'string') {
          createdNotificationId = firstItem;
        } else if (firstItem?.id) {
          createdNotificationId = firstItem.id;
        } else if (firstItem?.create_broadcast_notification_v2) {
          createdNotificationId = firstItem.create_broadcast_notification_v2;
        }
      } else if (notificationId && typeof notificationId === 'object') {
        const payload = notificationId as {
          id?: string;
          create_broadcast_notification_v2?: string;
        };

        if (payload.id) {
          createdNotificationId = payload.id;
        } else if (payload.create_broadcast_notification_v2) {
          createdNotificationId = payload.create_broadcast_notification_v2;
        }
      }

      if (!createdNotificationId) {
        const { data: fallbackRows, error: fallbackError } = await supabase
          .from('broadcast_notifications')
          .select('*')
          .eq('title', data.title)
          .eq('message', data.message)
          .eq('recipient_type', data.recipient_type)
          .gte('created_at', requestTime)
          .order('created_at', { ascending: false })
          .limit(1);

        if (fallbackError) {
          console.error('Fallback lookup failed:', fallbackError);
          throw fallbackError;
        }

        return fallbackRows?.[0] ?? null;
      }

      const { data: createdNotification, error: fetchError } = await supabase
        .from('broadcast_notifications')
        .select('*')
        .eq('id', createdNotificationId)
        .single();

      if (fetchError) {
        console.error('Error fetching created notification:', fetchError);
        throw fetchError;
      }

      return createdNotification;
    } catch (error) {
      console.error('Error creating broadcast notification:', error);
      throw error;
    }
  }

  async updateBroadcastNotificationDraft(
    notificationId: string,
    data: {
      title: string;
      message: string;
      recipient_type: 'patients' | 'providers' | 'both';
      scheduled_at?: string | null;
    }
  ): Promise<any | null> {
    try {
      const { data: updatedNotification, error } = await supabase
        .from('broadcast_notifications')
        .update({
          title: data.title,
          message: data.message,
          recipient_type: data.recipient_type,
          scheduled_at: data.scheduled_at || null,
        })
        .eq('id', notificationId)
        .eq('status', 'draft')
        .select('*')
        .single();

      if (error) throw error;
      return updatedNotification;
    } catch (error) {
      console.error('Error updating draft notification:', error);
      throw error;
    }
  }

  async sendBroadcastNotificationNow(notificationId: string): Promise<any | null> {
    try {
      const { data: result, error } = await supabase.rpc(
        'send_broadcast_notification_now',
        { p_notification_id: notificationId }
      );

      if (error) {
        console.error('Error sending notification now:', error);
        throw error;
      }

      const parsedNotificationId = Array.isArray(result)
        ? (result[0] as { send_broadcast_notification_now?: string } | undefined)
            ?.send_broadcast_notification_now ?? null
        : typeof result === 'string'
          ? result
          : result && typeof result === 'object' && 'send_broadcast_notification_now' in result
            ? String((result as { send_broadcast_notification_now: unknown }).send_broadcast_notification_now)
            : null;

      const resolvedNotificationId = parsedNotificationId || notificationId;

      const { data: updatedNotification, error: fetchError } = await supabase
        .from('broadcast_notifications')
        .select('*')
        .eq('id', resolvedNotificationId)
        .single();

      if (fetchError) throw fetchError;
      return updatedNotification;
    } catch (error) {
      console.error('Error in sendBroadcastNotificationNow:', error);
      throw error;
    }
  }

  async deleteBroadcastNotificationDraft(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('broadcast_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('status', 'draft');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting draft notification:', error);
      throw error;
    }
  }

  async processScheduledBroadcastNotifications(): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('process_scheduled_broadcast_notifications');

      if (error) throw error;

      if (typeof data === 'number') {
        return data;
      }

      if (Array.isArray(data) && typeof data[0] === 'number') {
        return data[0];
      }

      return 0;
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
      throw error;
    }
  }

  async updateBroadcastNotificationStatus(
    notificationId: string,
    status: 'draft' | 'scheduled' | 'sent'
  ): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('broadcast_notifications')
        .update({
          status,
          sent_at: status === 'sent' ? new Date().toISOString() : null,
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating notification status:', error);
      throw error;
    }
  }
}

export const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;