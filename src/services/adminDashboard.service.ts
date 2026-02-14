import { supabase } from './supabase';
import type {
  DashboardMetrics,
  Patient,
  PatientDetails,
  Provider,
  ProviderDetails,
  ProviderDocument,
  Appointment,
  AppointmentDetails,
  ListResponse,
  PaginationOptions,
  FinancialMetrics,
  ProviderPayout,
  TransactionRecord,
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
} from '@app-types/index';

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
        query = query.or(
          `name.ilike.%${params.search}%,phone_number.like.%${params.search}%`
        );
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
        query = query.or(
          `name.ilike.%${params.search}%,specialty.ilike.%${params.search}%,phone_number.like.%${params.search}%,license_number.ilike.%${params.search}%`
        );
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
        query = query.or(
          `name.ilike.%${params.search}%,specialty.ilike.%${params.search}%,phone_number.like.%${params.search}%,license_number.ilike.%${params.search}%`
        );
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
        query = query.or(
          `location.ilike.%${params.search}%,notes.ilike.%${params.search}%`
        );
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

      return normalized as PatientDetails;
    } catch (error) {
      console.error('Error fetching patient details:', error);
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

      // Get platform revenue (20% from completed appointments)
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select('total_cost')
        .eq('status', 'Completed');

      if (appointmentError) {
        console.error('Appointments error:', appointmentError);
        throw appointmentError;
      }

      const platformRevenue = (appointments || [])
        .reduce((sum, a) => sum + (a.total_cost ? parseFloat(a.total_cost.toString()) * 0.2 : 0), 0);

      // Get pending payouts
      const { data: payouts, error: payoutError } = await supabase
        .from('provider_payouts')
        .select('amount')
        .eq('status', 'pending');

      if (payoutError) {
        console.error('Payouts error:', payoutError);
        throw payoutError;
      }

      const pendingPayouts = (payouts || [])
        .reduce((sum, p) => sum + (p.amount || 0), 0);

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
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      // Financial metrics calculated successfully

      return {
        patientWalletBalance,
        providerWalletBalance,
        platformRevenue,
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
      type?: 'topup' | 'payment' | 'refund' | 'all';
      status?: 'completed' | 'pending' | 'failed' | 'all';
    }
  ): Promise<ListResponse<TransactionRecord> | null> {
    try {
      let query = supabase
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
        query = query.eq('type', params.type);
      }

      if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      if (params?.search) {
        query = query.or(`reference.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) throw error;

      const transactions = (data || []).map((tx: any) => ({
        ...tx,
        patient_name: tx.patients?.name,
        provider_name: tx.providers?.name,
      })) as TransactionRecord[];

      return {
        data: transactions,
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return null;
    }
  }

  /**
   * Get provider payouts with pagination
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
        .from('provider_payouts')
        .select(`
          *,
          providers!provider_payouts_provider_id_fkey (
            name
          )
        `, { count: 'exact' });

      if (params?.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      if (params?.provider_id) {
        query = query.eq('provider_id', params.provider_id);
      }

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(
          (options.page - 1) * options.pageSize,
          options.page * options.pageSize - 1
        );

      if (error) throw error;

      const payouts = (data || []).map((payout: any) => ({
        ...payout,
        provider_name: payout.providers?.name,
      })) as ProviderPayout[];

      return {
        data: payouts,
        total: count || 0,
        page: options.page,
        pageSize: options.pageSize,
      };
    } catch (error) {
      console.error('Error fetching provider payouts:', error);
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
      const updates: any = { status };

      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('provider_payouts')
        .update(updates)
        .eq('id', payoutId)
        .select('*')
        .single();

      if (error) throw error;

      return (data || null) as ProviderPayout | null;
    } catch (error) {
      console.error('Error updating payout status:', error);
      throw error;
    }
  }

  /**
   * Get appointments by service type
   */
  async getAppointmentsByService(): Promise<AppointmentsByService[] | null> {
    try {
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
    } catch (error) {
      console.error('Error fetching appointments by service:', error);
      return null;
    }
  }

  /**
   * Get top locations by appointment count and revenue
   */
  async getTopLocations(limit: number = 10): Promise<LocationAnalytics[] | null> {
    try {
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          total_cost,
          status,
          patients!appointments_patient_id_fkey (
            id,
            patient_addresses (
              state
            )
          )
        `);

      if (appointmentError) throw appointmentError;

      const locationStats = (appointments || [])
        .filter(apt => 
          apt.status === 'Completed' && 
          Array.isArray(apt.patients) &&
          apt.patients.length > 0 &&
          Array.isArray(apt.patients[0]?.patient_addresses) &&
          apt.patients[0].patient_addresses.length > 0
        )
        .reduce((acc: Record<string, { count: number; revenue: number }>, apt) => {
          // Get the first address (most relevant)
          const state = Array.isArray(apt.patients) && apt.patients[0]?.patient_addresses?.[0]?.state;
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
    } catch (error) {
      console.error('Error fetching top locations:', error);
      return null;
    }
  }

  /**
   * Get top earning providers
   */
  async getTopEarningProviders(limit: number = 10): Promise<ProviderEarnings[] | null> {
    try {
      const { data: appointments, error: appointmentError } = await supabase
        .from('appointments')
        .select(`
          provider_id,
          total_cost,
          status,
          providers!appointments_provider_id_fkey (
            name
          )
        `)
        .eq('status', 'Completed');

      if (appointmentError) throw appointmentError;

      const providerStats = (appointments || [])
        .reduce((acc: Record<string, { name: string; earnings: number; count: number }>, apt) => {
          if (!acc[apt.provider_id]) {
            acc[apt.provider_id] = {
              name: (Array.isArray(apt.providers) && apt.providers[0]?.name) || 'Unknown',
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
    } catch (error) {
      console.error('Error fetching top earning providers:', error);
      return null;
    }
  }

  /**
   * Get top providers by rating
   */
  async getTopProvidersByRating(limit: number = 10): Promise<ProviderRating[] | null> {
    try {
      const { data: reviews, error: reviewError } = await supabase
        .from('reviews')
        .select(`
          provider_id,
          rating,
          providers!reviews_provider_id_fkey (
            name
          )
        `);

      if (reviewError) throw reviewError;

      const providerRatings = (reviews || [])
        .reduce((acc: Record<string, { name: string; totalRating: number; count: number }>, review) => {
          if (!acc[review.provider_id]) {
            acc[review.provider_id] = {
              name: (Array.isArray(review.providers) && review.providers[0]?.name) || 'Unknown',
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
    } catch (error) {
      console.error('Error fetching top providers by rating:', error);
      return null;
    }
  }

  /**
   * Get appointment trends
   */
  async getAppointmentTrends(): Promise<AnalyticsMetrics['appointmentTrends'] | null> {
    try {
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
    } catch (error) {
      console.error('Error fetching appointment trends:', error);
      return null;
    }
  }

  /**
   * Get all analytics metrics
   */
  async getAnalyticsMetrics(): Promise<AnalyticsMetrics | null> {
    try {
      const [
        appointmentsByService,
        topLocations,
        topEarningProviders,
        topProvidersByRating,
        appointmentTrends,
      ] = await Promise.all([
        this.getAppointmentsByService(),
        this.getTopLocations(),
        this.getTopEarningProviders(),
        this.getTopProvidersByRating(),
        this.getAppointmentTrends(),
      ]);

      return {
        appointmentsByService: appointmentsByService || [],
        topLocations: topLocations || [],
        topEarningProviders: topEarningProviders || [],
        topProvidersByRating: topProvidersByRating || [],
        appointmentTrends: appointmentTrends || { daily: [], weekly: [], monthly: [] },
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
      const { data, error } = await supabase
        .from('admin_users')
        .select('id, auth_id, email, name, role, is_active, last_login_at, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(admin => ({
        id: admin.id,
        auth_id: admin.auth_id,
        email: admin.email,
        name: admin.name,
        role: admin.role as 'super_admin' | 'admin' | 'moderator',
        is_active: admin.is_active,
        last_login_at: admin.last_login_at,
        created_at: admin.created_at,
        updated_at: admin.updated_at,
      }));
    } catch (error) {
      console.error('Error fetching admin users:', error);
      return null;
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
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create auth user');

      // 2. Create admin_users record
      const { data, error } = await supabase
        .from('admin_users')
        .insert({
          auth_id: authData.user.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        // Rollback auth user if admin record creation fails
        await supabase.auth.admin.deleteUser(authData.user.id);
        throw error;
      }

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
      console.error('Error creating admin user:', error);
      return null;
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
}

export const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;
