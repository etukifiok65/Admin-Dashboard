-- Insert sample messages for testing the Support Messages page

INSERT INTO public.messages 
  (name, email, phone, subject, message, category, priority, status)
VALUES 
  (
    'John Doe',
    'john.doe@example.com',
    '+234 801 234 5678',
    'Cannot book appointment',
    'I am having trouble booking an appointment through the website. Every time I try to select a provider and time slot, I get an error message saying "Something went wrong". I have tried multiple times with different browsers but the issue persists. Please help!',
    'technical',
    'high',
    'new'
  ),
  (
    'Jane Smith',
    'jane.smith@example.com',
    '+234 802 345 6789',
    'Billing inquiry - Double charge',
    'I was charged twice for my last appointment on February 20th. My bank statement shows two charges of NGN 10,000 each for the same appointment. The appointment ID was shown in the receipt. I need this resolved urgently as it''s affecting my budget.',
    'billing',
    'urgent',
    'new'
  ),
  (
    'Bob Johnson',
    'bob.j@example.com',
    NULL,
    'Great service!',
    'I just wanted to send a quick message to say thank you for the excellent care I received from Dr. Sarah. She was very professional, thorough, and compassionate. The entire process from booking to the actual home visit was seamless. Keep up the great work!',
    'feedback',
    'low',
    'new'
  ),
  (
    'Alice Williams',
    'alice.williams@example.com',
    '+234 803 456 7890',
    'Provider arrived late',
    'My nurse was scheduled to arrive at 2 PM but didn''t show up until 3:30 PM. While the care was good once they arrived, this delay caused significant inconvenience as I had other commitments. I would appreciate it if the team could be more punctual in the future.',
    'complaint',
    'normal',
    'in_progress'
  ),
  (
    'Michael Brown',
    'michael.brown@example.com',
    '+234 804 567 8901',
    'How do I cancel my appointment?',
    'I need to cancel my upcoming appointment scheduled for tomorrow at 10 AM because of a sudden work emergency. I tried looking for a cancel button in my account but couldn''t find it. Can someone guide me on how to cancel, and will I get a refund?',
    'appointment',
    'normal',
    'responded'
  ),
  (
    'Sarah Davis',
    'sarah.d@example.com',
    '+234 805 678 9012',
    'Request for specialized care',
    'I am looking for a provider who specializes in elderly care with experience in dementia patients. My mother needs regular home visits and I want to ensure the provider has the necessary expertise. Could you help me find a suitable match?',
    'general',
    'normal',
    'resolved'
  );

-- Simulate an admin response for one of the messages
UPDATE public.messages
SET 
  admin_response = 'Thank you for contacting us. To cancel your appointment, please log into your account, go to "My Appointments" section, click on the scheduled appointment, and you will see a "Cancel Appointment" button. You will receive a full refund if you cancel at least 24 hours before the scheduled time. For cancellations within 24 hours, a partial refund may apply. Let me know if you need any further assistance!',
  status = 'responded',
  responded_at = NOW()
WHERE email = 'michael.brown@example.com';

