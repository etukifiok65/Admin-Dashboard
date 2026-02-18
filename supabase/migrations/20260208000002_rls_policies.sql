-- =====================================================
-- Row-Level Security (RLS) Policies
-- Migration: RLS Setup
-- Created: 2026-02-08
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_medical_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE static_content ENABLE ROW LEVEL SECURITY;
-- =====================================================
-- PATIENT POLICIES
-- =====================================================

-- Patients: Users can read and update their own profile
CREATE POLICY "Patients can view own profile"
    ON patients FOR SELECT
    USING (auth.uid() = auth_id);
CREATE POLICY "Patients can update own profile"
    ON patients FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "Patients can insert own profile"
    ON patients FOR INSERT
    WITH CHECK (auth.uid() = auth_id);
-- Patient Addresses: Patients can manage their own addresses
CREATE POLICY "Patients can view own addresses"
    ON patient_addresses FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can insert own addresses"
    ON patient_addresses FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can update own addresses"
    ON patient_addresses FOR UPDATE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can delete own addresses"
    ON patient_addresses FOR DELETE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- Emergency Contacts: Patients can manage their own contacts
CREATE POLICY "Patients can view own emergency contacts"
    ON emergency_contacts FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can insert own emergency contacts"
    ON emergency_contacts FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can update own emergency contacts"
    ON emergency_contacts FOR UPDATE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can delete own emergency contacts"
    ON emergency_contacts FOR DELETE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- Medical Info: Patients can manage their own medical info
CREATE POLICY "Patients can view own medical info"
    ON medical_info FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can insert own medical info"
    ON medical_info FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can update own medical info"
    ON medical_info FOR UPDATE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- Patient Settings: Patients can manage their own settings
CREATE POLICY "Patients can view own settings"
    ON patient_settings FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can insert own settings"
    ON patient_settings FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can update own settings"
    ON patient_settings FOR UPDATE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- =====================================================
-- PROVIDER POLICIES
-- =====================================================

-- Providers: Public can view verified providers; providers can update own profile
CREATE POLICY "Anyone can view verified providers"
    ON providers FOR SELECT
    USING (is_verified = TRUE AND account_status = 'approved');
CREATE POLICY "Providers can view own profile"
    ON providers FOR SELECT
    USING (auth.uid() = auth_id);
CREATE POLICY "Providers can update own profile"
    ON providers FOR UPDATE
    USING (auth.uid() = auth_id)
    WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "Providers can insert own profile"
    ON providers FOR INSERT
    WITH CHECK (auth.uid() = auth_id);
-- Provider Documents: Providers can manage their own documents
CREATE POLICY "Providers can view own documents"
    ON provider_documents FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can insert own documents"
    ON provider_documents FOR INSERT
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- Provider Service Areas: Public can view active areas; providers can manage own
CREATE POLICY "Anyone can view active service areas"
    ON provider_service_areas FOR SELECT
    USING (is_active = TRUE);
CREATE POLICY "Providers can view own service areas"
    ON provider_service_areas FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can insert own service areas"
    ON provider_service_areas FOR INSERT
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can update own service areas"
    ON provider_service_areas FOR UPDATE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can delete own service areas"
    ON provider_service_areas FOR DELETE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- Provider Availability: Public can view; providers can manage own
CREATE POLICY "Anyone can view provider availability"
    ON provider_availability FOR SELECT
    USING (TRUE);
CREATE POLICY "Providers can insert own availability"
    ON provider_availability FOR INSERT
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can update own availability"
    ON provider_availability FOR UPDATE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can delete own availability"
    ON provider_availability FOR DELETE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- Provider Time Slots: Public can view; providers can manage own
CREATE POLICY "Anyone can view provider time slots"
    ON provider_time_slots FOR SELECT
    USING (TRUE);
CREATE POLICY "Providers can insert own time slots"
    ON provider_time_slots FOR INSERT
    WITH CHECK (availability_id IN (
        SELECT id FROM provider_availability WHERE provider_id IN (
            SELECT id FROM providers WHERE auth_id = auth.uid()
        )
    ));
CREATE POLICY "Providers can update own time slots"
    ON provider_time_slots FOR UPDATE
    USING (availability_id IN (
        SELECT id FROM provider_availability WHERE provider_id IN (
            SELECT id FROM providers WHERE auth_id = auth.uid()
        )
    ))
    WITH CHECK (availability_id IN (
        SELECT id FROM provider_availability WHERE provider_id IN (
            SELECT id FROM providers WHERE auth_id = auth.uid()
        )
    ));
CREATE POLICY "Providers can delete own time slots"
    ON provider_time_slots FOR DELETE
    USING (availability_id IN (
        SELECT id FROM provider_availability WHERE provider_id IN (
            SELECT id FROM providers WHERE auth_id = auth.uid()
        )
    ));
-- Provider Payout Methods: Providers can manage their own payout methods
CREATE POLICY "Providers can view own payout methods"
    ON provider_payout_methods FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can insert own payout methods"
    ON provider_payout_methods FOR INSERT
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can update own payout methods"
    ON provider_payout_methods FOR UPDATE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can delete own payout methods"
    ON provider_payout_methods FOR DELETE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- Provider Settings: Providers can manage their own settings
CREATE POLICY "Providers can view own settings"
    ON provider_settings FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can insert own settings"
    ON provider_settings FOR INSERT
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can update own settings"
    ON provider_settings FOR UPDATE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- Provider Earnings: Providers can view own earnings
CREATE POLICY "Providers can view own earnings"
    ON provider_earnings FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can insert own earnings"
    ON provider_earnings FOR INSERT
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- Provider Payouts: Providers can view own payouts
CREATE POLICY "Providers can view own payouts"
    ON provider_payouts FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- =====================================================
-- SERVICE POLICIES
-- =====================================================

-- Service Categories: Public read access
CREATE POLICY "Anyone can view service categories"
    ON service_categories FOR SELECT
    USING (TRUE);
-- Service Rates: Public can view active rates; providers can manage own
CREATE POLICY "Anyone can view active service rates"
    ON service_rates FOR SELECT
    USING (is_active = TRUE);
CREATE POLICY "Providers can view own service rates"
    ON service_rates FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can insert own service rates"
    ON service_rates FOR INSERT
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can update own service rates"
    ON service_rates FOR UPDATE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can delete own service rates"
    ON service_rates FOR DELETE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- =====================================================
-- APPOINTMENT POLICIES
-- =====================================================

-- Appointments: Patients can view/manage their own; providers can view/manage their own
CREATE POLICY "Patients can view own appointments"
    ON appointments FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can view own appointments"
    ON appointments FOR SELECT
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can create appointments"
    ON appointments FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can update own appointments"
    ON appointments FOR UPDATE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Providers can update own appointments"
    ON appointments FOR UPDATE
    USING (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()))
    WITH CHECK (provider_id IN (SELECT id FROM providers WHERE auth_id = auth.uid()));
-- Appointment Medical Info: Linked to appointment access
CREATE POLICY "Patients can view own appointment medical info"
    ON appointment_medical_info FOR SELECT
    USING (appointment_id IN (
        SELECT id FROM appointments WHERE patient_id IN (
            SELECT id FROM patients WHERE auth_id = auth.uid()
        )
    ));
CREATE POLICY "Providers can view appointment medical info"
    ON appointment_medical_info FOR SELECT
    USING (appointment_id IN (
        SELECT id FROM appointments WHERE provider_id IN (
            SELECT id FROM providers WHERE auth_id = auth.uid()
        )
    ));
CREATE POLICY "Patients can insert own appointment medical info"
    ON appointment_medical_info FOR INSERT
    WITH CHECK (appointment_id IN (
        SELECT id FROM appointments WHERE patient_id IN (
            SELECT id FROM patients WHERE auth_id = auth.uid()
        )
    ));
CREATE POLICY "Patients can update own appointment medical info"
    ON appointment_medical_info FOR UPDATE
    USING (appointment_id IN (
        SELECT id FROM appointments WHERE patient_id IN (
            SELECT id FROM patients WHERE auth_id = auth.uid()
        )
    ))
    WITH CHECK (appointment_id IN (
        SELECT id FROM appointments WHERE patient_id IN (
            SELECT id FROM patients WHERE auth_id = auth.uid()
        )
    ));
-- =====================================================
-- REVIEW POLICIES
-- =====================================================

-- Reviews: Public can read verified provider reviews; patients can create/read own
CREATE POLICY "Anyone can view reviews for verified providers"
    ON reviews FOR SELECT
    USING (provider_id IN (
        SELECT id FROM providers WHERE is_verified = TRUE AND account_status = 'approved'
    ));
CREATE POLICY "Patients can view own reviews"
    ON reviews FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can create reviews"
    ON reviews FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- Review Helpful Votes: Authenticated patients can vote
CREATE POLICY "Patients can view helpful votes"
    ON review_helpful_votes FOR SELECT
    USING (TRUE);
CREATE POLICY "Patients can add helpful votes"
    ON review_helpful_votes FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can remove own helpful votes"
    ON review_helpful_votes FOR DELETE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- =====================================================
-- PAYMENT POLICIES
-- =====================================================

-- Saved Cards: Patients can manage their own cards
CREATE POLICY "Patients can view own saved cards"
    ON saved_cards FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can insert own saved cards"
    ON saved_cards FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can update own saved cards"
    ON saved_cards FOR UPDATE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()))
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can delete own saved cards"
    ON saved_cards FOR DELETE
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- Patient Wallet: Patients can view own wallet
CREATE POLICY "Patients can view own wallet"
    ON patient_wallet FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
CREATE POLICY "Patients can insert own wallet"
    ON patient_wallet FOR INSERT
    WITH CHECK (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- Transactions: Patients can view own transactions
CREATE POLICY "Patients can view own transactions"
    ON transactions FOR SELECT
    USING (patient_id IN (SELECT id FROM patients WHERE auth_id = auth.uid()));
-- =====================================================
-- CONFIG & STATIC CONTENT POLICIES
-- =====================================================

-- App Config: Public read access
CREATE POLICY "Anyone can view app config"
    ON app_config FOR SELECT
    USING (TRUE);
-- Static Content: Public read access
CREATE POLICY "Anyone can view static content"
    ON static_content FOR SELECT
    USING (TRUE);
-- =====================================================
-- END OF RLS POLICIES
-- =====================================================;
