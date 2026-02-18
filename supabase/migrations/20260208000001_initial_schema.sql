-- =====================================================
-- HomiCareplus Database Schema
-- Migration: Initial Schema Setup
-- Created: 2026-02-08
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- =====================================================
-- HELPER FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- =====================================================
-- PATIENT TABLES
-- =====================================================

-- Patients Profile
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    phone_number TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    blood_type TEXT,
    height TEXT,
    weight TEXT,
    profile_image_url TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Patient Addresses
CREATE TABLE patient_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    address_line_1 TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    country TEXT NOT NULL,
    landmark TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Emergency Contacts
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    relationship TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Medical Information
CREATE TABLE medical_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE UNIQUE NOT NULL,
    allergies TEXT[],
    conditions TEXT[],
    medications TEXT[],
    surgeries TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_medical_info_updated_at BEFORE UPDATE ON medical_info
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Patient Settings
CREATE TABLE patient_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE UNIQUE NOT NULL,
    language TEXT DEFAULT 'en',
    biometric_auth BOOLEAN DEFAULT FALSE,
    location_tracking BOOLEAN DEFAULT FALSE,
    auto_logout BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_patient_settings_updated_at BEFORE UPDATE ON patient_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- PROVIDER TABLES
-- =====================================================

-- Providers Profile
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    phone_number TEXT,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')),
    specialty TEXT NOT NULL,
    license_number TEXT UNIQUE,
    experience TEXT,
    qualification TEXT,
    about TEXT,
    bio TEXT,
    languages TEXT[],
    specializations TEXT[],
    profile_image_url TEXT,
    account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'approved', 'rejected', 'document_pending', 'pending_approval')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Provider Documents (for verification)
CREATE TABLE provider_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('medical_certificate', 'government_id', 'other')),
    storage_path TEXT NOT NULL,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT
);
-- Provider Service Areas
CREATE TABLE provider_service_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    country TEXT NOT NULL,
    state TEXT NOT NULL,
    travel_radius INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Provider Availability (Weekly Template)
CREATE TABLE provider_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    is_available BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (provider_id, day_of_week)
);
-- Provider Time Slots
CREATE TABLE provider_time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    availability_id UUID REFERENCES provider_availability(id) ON DELETE CASCADE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Provider Payout Methods
CREATE TABLE provider_payout_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    method_type TEXT NOT NULL CHECK (method_type IN ('bank_account', 'mobile_money')),
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_code TEXT,
    bank_name TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Provider Settings
CREATE TABLE provider_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    language TEXT DEFAULT 'en',
    auto_accept_appointments BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_provider_settings_updated_at BEFORE UPDATE ON provider_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Provider Earnings
CREATE TABLE provider_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE UNIQUE NOT NULL,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    completed_visits INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_provider_earnings_updated_at BEFORE UPDATE ON provider_earnings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Provider Payouts
CREATE TABLE provider_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    payout_method_id UUID REFERENCES provider_payout_methods(id),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
-- =====================================================
-- SERVICE TABLES
-- =====================================================

-- Service Categories (Master data)
CREATE TABLE service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    base_price DECIMAL(10, 2),
    duration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Service Rates (Provider-specific pricing)
CREATE TABLE service_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    service_category_id UUID REFERENCES service_categories(id),
    title TEXT NOT NULL,
    description TEXT,
    base_rate DECIMAL(10, 2) NOT NULL,
    minimum_rate DECIMAL(10, 2),
    maximum_rate DECIMAL(10, 2),
    currency TEXT DEFAULT 'NGN',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_service_rates_updated_at BEFORE UPDATE ON service_rates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- APPOINTMENT TABLES
-- =====================================================

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL CHECK (service_type IN ('Doctor Visit', 'Nurse Care', 'Home Care', 'Specialized Care')),
    appointment_type TEXT DEFAULT 'home',
    status TEXT DEFAULT 'Requested' CHECK (status IN ('Requested', 'Scheduled', 'Completed', 'Cancelled')),
    duration TEXT NOT NULL CHECK (duration IN ('single', 'daily')),
    number_of_days INTEGER,
    number_of_patients INTEGER,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    location TEXT,
    notes TEXT,
    urgency_level TEXT DEFAULT 'normal' CHECK (urgency_level IN ('normal', 'high', 'urgent')),
    total_cost DECIMAL(10, 2),
    currency TEXT DEFAULT 'NGN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT
);
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Appointment Medical Information
CREATE TABLE appointment_medical_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE UNIQUE NOT NULL,
    current_symptoms TEXT,
    medical_history TEXT,
    allergies TEXT,
    current_medications TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_appointment_medical_info_updated_at BEFORE UPDATE ON appointment_medical_info
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- REVIEW TABLES
-- =====================================================

-- Reviews
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    service TEXT,
    verified BOOLEAN DEFAULT TRUE,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Review Helpful Votes
CREATE TABLE review_helpful_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (review_id, patient_id)
);
-- =====================================================
-- PAYMENT TABLES
-- =====================================================

-- Saved Payment Cards
CREATE TABLE saved_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    card_type TEXT NOT NULL,
    last_4 TEXT NOT NULL,
    expiry_month TEXT,
    expiry_year TEXT,
    cardholder_name TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Patient Wallet
CREATE TABLE patient_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0,
    currency TEXT DEFAULT 'NGN',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_patient_wallet_updated_at BEFORE UPDATE ON patient_wallet
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('topup', 'payment', 'refund')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'failed')),
    reference TEXT,
    payment_method TEXT,
    provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- =====================================================
-- CONFIG & STATIC CONTENT TABLES
-- =====================================================

-- App Configuration
CREATE TABLE app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    data_type TEXT DEFAULT 'string',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- Static Content (Documents, FAQs)
CREATE TABLE static_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('document', 'faq')),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE TRIGGER update_static_content_updated_at BEFORE UPDATE ON static_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Patient indexes
CREATE INDEX idx_patients_auth_id ON patients(auth_id);
CREATE INDEX idx_patients_verification_status ON patients(verification_status);
-- Provider indexes
CREATE INDEX idx_providers_auth_id ON providers(auth_id);
CREATE INDEX idx_providers_specialty ON providers(specialty);
CREATE INDEX idx_providers_account_status ON providers(account_status);
CREATE INDEX idx_providers_is_verified ON providers(is_verified);
CREATE INDEX idx_providers_license_number ON providers(license_number);
-- Provider documents indexes
CREATE INDEX idx_provider_documents_provider_id ON provider_documents(provider_id);
CREATE INDEX idx_provider_documents_verification_status ON provider_documents(verification_status);
-- Service areas indexes
CREATE INDEX idx_provider_service_areas_provider_id ON provider_service_areas(provider_id);
CREATE INDEX idx_provider_service_areas_state ON provider_service_areas(state);
CREATE INDEX idx_provider_service_areas_is_active ON provider_service_areas(is_active);
-- Availability indexes
CREATE INDEX idx_provider_availability_provider_id ON provider_availability(provider_id);
CREATE INDEX idx_provider_time_slots_availability_id ON provider_time_slots(availability_id);
-- Service rates indexes
CREATE INDEX idx_service_rates_provider_id ON service_rates(provider_id);
CREATE INDEX idx_service_rates_service_category_id ON service_rates(service_category_id);
CREATE INDEX idx_service_rates_is_active ON service_rates(is_active);
-- Appointment indexes
CREATE INDEX idx_appointments_provider_id ON appointments(provider_id);
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_service_type ON appointments(service_type);
CREATE INDEX idx_appointments_provider_status_date ON appointments(provider_id, status, scheduled_date);
CREATE INDEX idx_appointments_patient_status_date ON appointments(patient_id, status, scheduled_date);
-- Review indexes
CREATE INDEX idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX idx_reviews_patient_id ON reviews(patient_id);
CREATE INDEX idx_reviews_appointment_id ON reviews(appointment_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
CREATE INDEX idx_review_helpful_votes_review_id ON review_helpful_votes(review_id);
-- Payment indexes
CREATE INDEX idx_saved_cards_patient_id ON saved_cards(patient_id);
CREATE INDEX idx_patient_wallet_patient_id ON patient_wallet(patient_id);
CREATE INDEX idx_transactions_patient_id ON transactions(patient_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
-- Address & contacts indexes
CREATE INDEX idx_patient_addresses_patient_id ON patient_addresses(patient_id);
CREATE INDEX idx_emergency_contacts_patient_id ON emergency_contacts(patient_id);
CREATE INDEX idx_medical_info_patient_id ON medical_info(patient_id);
-- Config indexes
CREATE INDEX idx_app_config_key ON app_config(key);
CREATE INDEX idx_static_content_type ON static_content(type);
CREATE INDEX idx_static_content_category ON static_content(category);
-- =====================================================
-- END OF INITIAL SCHEMA
-- =====================================================;
