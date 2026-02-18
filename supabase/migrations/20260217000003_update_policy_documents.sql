-- Update policy documents with correct titles and content
-- This fixes the issue where document titles didn't match UI expectations

-- First, delete old placeholder documents
DELETE FROM static_content WHERE type = 'document' AND category = 'legal';
-- Insert updated documents with full content
INSERT INTO static_content (type, category, title, content, order_index) VALUES
('document', 'legal', 'Patient Terms of Service', 'PATIENT TERMS OF SERVICE

Welcome to HomiCareplus. These Terms of Service ("Terms") govern your use of our mobile application and services.

IMPORTANT: HOMICAREPLUS IS NOT FOR EMERGENCIES. IF YOU ARE EXPERIENCING A LIFE-THREATENING CONDITION, CALL YOUR LOCAL EMERGENCY SERVICE OR GO TO THE NEAREST ACCIDENT & EMERGENCY DEPARTMENT IMMEDIATELY.

1. ACCEPTANCE OF TERMS
By accessing or using HomiCareplus, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.

2. DESCRIPTION OF SERVICE
2.1 Facilitation Only: HomiCareplus is a technology platform that connects you with independent, licensed healthcare professionals.
2.2 No Medical Advice: We do not provide medical advice or treatments. Any medical advice received comes solely from the Provider.
2.3 Informed Consent: By booking a service, you consent to being treated in your home or chosen location.

3. PATIENT ACCOUNTS
You must provide accurate information when creating an account and maintain the confidentiality of your credentials.

4. BOOKING AND CANCELLATIONS
Cancellation fees may apply if you cancel within 30 minutes of scheduled arrival.

5. PAYMENT TERMS
All payments must be made through the app. We are not responsible for any cash paid directly to Providers.

6. PRIVACY AND DATA PROTECTION
We comply with the Nigeria Data Protection Act (NDPA). You have the right to request access to or deletion of your data.

7. LIMITATION OF LIABILITY
HomiCareplus is not liable for any direct, indirect, incidental, or consequential damages arising from your use of our services.

For questions, contact: support@homicareplus.com', 1),
('document', 'legal', 'Privacy Policy', 'PRIVACY POLICY

This Privacy Policy describes how HomiCareplus collects, uses, and protects your personal information.

1. INFORMATION WE COLLECT
- Personal Information: Name, email, phone, date of birth, address
- Medical Information: Health conditions, symptoms, allergies, medications
- Usage Information: App usage patterns, device information, location data

2. HOW WE USE YOUR INFORMATION
We use your information to provide healthcare services, match you with providers, process payments, and ensure platform security.

3. INFORMATION SHARING
We may share your information with healthcare providers you book, payment processors, and as required by law.

4. DATA SECURITY
We implement industry-standard security measures including encryption, secure storage, and regular audits.

5. YOUR RIGHTS
You have the right to access, correct, or delete your information, and opt out of marketing communications.

6. DATA RETENTION
Medical records are retained for 10 years as per healthcare regulations.

7. CONTACT US
For questions about this policy: support@homicareplus.com', 2),
('document', 'legal', 'Data Usage Policy', 'DATA USAGE POLICY

This Data Usage Policy explains how HomiCareplus collects, processes, and uses your data.

1. DATA COLLECTION PURPOSES
- Healthcare Service Delivery: Matching with providers, scheduling, payments
- Platform Improvement: Analyzing usage patterns, fixing issues, security

2. TYPES OF DATA PROCESSED
- Identity Data: Government-issued ID, photos, contact information
- Health Data: Symptoms, medical history, medications, appointment notes
- Behavioral Data: App usage patterns, search queries, booking patterns

3. DATA PROCESSING LEGAL BASIS
We process your data based on your consent, contractual necessity, legal obligations, and legitimate interests.

4. DATA SHARING PRACTICES
Data is shared with healthcare providers, payment processors, and cloud storage providers with appropriate safeguards.

5. DATA RETENTION PERIODS
- Account information: Active period plus 7 years
- Medical records: 10 years per healthcare regulations
- Transaction records: 7 years for compliance

6. DATA SECURITY MEASURES
- AES-256 encryption for data at rest
- TLS 1.3 encryption for data in transit
- Multi-factor authentication for admin access
- Regular security audits

7. YOUR DATA RIGHTS
You can access, correct, delete, or restrict processing of your data. Contact us to exercise these rights.

8. CONTACT
For data-related questions: support@homicareplus.com', 3);
