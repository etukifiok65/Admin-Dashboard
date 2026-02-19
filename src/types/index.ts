// Admin user type
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  created_at: string;
}

// Auth context
export interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalUsers: number;
  activePatients: number;
  verifiedProviders: number;
  pendingProviders: number;
  pendingPatients: number;
  todayAppointments: number;
  todayRevenue: number;
  thisMonthRevenue: number;
}

// Patient type
export interface Patient {
  id: string;
  auth_id: string;
  name: string;
  phone_number: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  profile_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface PatientAddress {
  id: string;
  patient_id: string;
  title?: string;
  address_line_1: string;
  city: string;
  state: string;
  country: string;
  landmark?: string;
  is_default?: boolean;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  phone_number: string;
  relationship: string;
  is_primary?: boolean;
  created_at: string;
}

export interface MedicalInfo {
  id: string;
  patient_id: string;
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  surgeries?: string[];
  updated_at: string;
}

export interface PatientDetails extends Patient {
  patient_addresses?: PatientAddress[];
  emergency_contacts?: EmergencyContact[];
  medical_info?: MedicalInfo | null;
}

// Provider type
export interface Provider {
  id: string;
  auth_id: string;
  name: string;
  phone_number: string;
  email?: string;
  specialty: string;
  license_number: string;
  address?: string;
  date_of_birth?: string;
  gender?: string;
  experience?: string;
  qualification?: string;
  about?: string;
  bio?: string;
  languages?: string[];
  specializations?: string[];
  account_status: 'pending' | 'approved' | 'rejected' | 'document_pending' | 'pending_approval';
  is_verified: boolean;
  is_active: boolean;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

// Provider document
export interface ProviderDocument {
  id: string;
  provider_id: string;
  document_type: 'medical_certificate' | 'government_id' | 'other';
  storage_path: string;
  verification_status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export interface ProviderDetails extends Provider {
  provider_documents?: ProviderDocument[];
}

// Appointment
export interface Appointment {
  id: string;
  patient_id: string;
  provider_id: string;
  service_type: 'Doctor Visit' | 'Nurse Care' | 'Home Care' | 'Specialized Care';
  appointment_type?: string;
  scheduled_date: string;
  scheduled_time?: string;
  location?: string;
  status: 'Requested' | 'Scheduled' | 'Completed' | 'Cancelled';
  duration: 'single' | 'daily';
  number_of_days?: number;
  number_of_patients?: number;
  notes?: string;
  urgency_level?: 'normal' | 'high' | 'urgent';
  total_cost?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface AppointmentDetails extends Appointment {
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
  provider_name?: string;
  provider_specialty?: string;
  provider_phone?: string;
  // Medical information
  medical_info?: {
    current_symptoms?: string;
    medical_history?: string;
    allergies?: string;
    current_medications?: string;
  };
  // Patient general medical info
  patient_medical_info?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    surgeries?: string[];
  };
  // Visit notes/records
  visit_notes?: {
    id: string;
    note_text: string;
    provider_signature: string;
    created_at: string;
    updated_at: string;
  };
}

// Transaction
export interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'withdrawal' | 'commission';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  created_at: string;
  updated_at: string;
}

// Payout request
export interface PayoutRequest {
  id: string;
  provider_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}

// Pagination options
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

// List response
export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// API Error
export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}

// Financial types
export interface FinancialMetrics {
  patientWalletBalance: number;
  providerWalletBalance: number;
  platformRevenue: number; // 20% commission from completed appointments
  pendingPayouts: number;
  totalTopUpRevenue: number; // All-time total top ups
}

export interface PayoutMethod {
  id: string;
  provider_id: string;
  method_type: 'bank_account' | 'mobile_money';
  account_name: string;
  account_number: string;
  bank_code?: string;
  bank_name?: string;
  is_default?: boolean;
  verified?: boolean;
}

export interface ProviderPayout {
  id: string;
  provider_id: string;
  provider_name?: string;
  payout_method_id?: string;
  payout_method?: PayoutMethod;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reference?: string;
  created_at: string;
  completed_at?: string;
}

export interface TransactionRecord {
  id: string;
  patient_id: string;
  patient_name?: string;
  type: 'topup' | 'payment' | 'refund' | 'withdrawal';
  amount: number;
  description?: string;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  payment_method?: string;
  provider_id?: string;
  provider_name?: string;
  created_at: string;
}

// Analytics Types
export interface AppointmentsByService {
  serviceType: string;
  count: number;
  percentage: number;
}

export interface LocationAnalytics {
  location: string;
  appointmentCount: number;
  revenue: number;
}

export interface ProviderEarnings {
  providerId: string;
  providerName: string;
  totalEarnings: number;
  appointmentCount: number;
  averageEarnings: number;
}

export interface ProviderRating {
  providerId: string;
  providerName: string;
  averageRating: number;
  totalReviews: number;
}

export interface AppointmentTrendData {
  date: string;
  appointments: number;
  revenue: number;
}

export interface AnalyticsMetrics {
  appointmentsByService: AppointmentsByService[];
  topLocations: LocationAnalytics[];
  topEarningProviders: ProviderEarnings[];
  topProvidersByRating: ProviderRating[];
  appointmentTrends: {
    daily: AppointmentTrendData[];
    weekly: AppointmentTrendData[];
    monthly: AppointmentTrendData[];
  };
}

// Settings Types
export interface AdminUserSettings {
  id: string;
  auth_id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformConfiguration {
  commissionRate: number; // Percentage (e.g., 20 for 20%)
  platformFee: number; // Fixed fee in currency
  maxAppointmentDays: number;
  minAppointmentNotice: number; // in hours
}

export interface ServiceTypeConfig {
  id: string;
  name: string;
  description: string;
  minRate: number;
  maxRate: number;
  duration: string;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AppointmentStatusConfig {
  id: string;
  status: string;
  displayName: string;
  description?: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Broadcast Notifications
export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  recipient_type: 'patients' | 'providers' | 'both';
  status: 'draft' | 'scheduled' | 'sent';
  scheduled_at?: string;
  sent_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  total_recipients?: number;
  delivered_count?: number;
  read_count?: number;
}

export interface BroadcastNotificationRecipient {
  id: string;
  broadcast_notification_id: string;
  patient_id?: string;
  provider_id?: string;
  read: boolean;
  read_at?: string;
  created_at: string;
}

export interface CreateBroadcastNotificationRequest {
  title: string;
  message: string;
  recipient_type: 'patients' | 'providers' | 'both';
  scheduled_at?: string;
}

// Audit Log type
export interface AuditLog {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  user_id: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  created_at: string;
  admin_user?: {
    name: string;
    email: string;
    role: string;
  };
}
