// This script can be run from the browser console on the Financial page
// It will test the updatePayoutStatus function with the authenticated context

// Step 1: Get a pending withdrawal ID to test
const testUpdate = async () => {
  try {
    // First, fetch the withdrawals to get an ID
    const response = await fetch('/api/financial/payouts', {
      headers: {
        'Content-Type': 'application/json',
        // Auth token will be sent automatically by browser
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch payouts:', response.status, response.statusText);
      return;
    }
    
    const payouts = await response.json();
    const pendingPayout = payouts.data?.find(p => p.status === 'pending');
    
    if (!pendingPayout) {
      console.log('❌ No pending payouts found to test');
      return;
    }
    
    console.log('✅ Found pending payout:', pendingPayout.id, pendingPayout.provider_name);
    
    // Now test updating it
    console.log('📝 Attempting to update payout status...');
    const updateResponse = await fetch(`/api/financial/payouts/${pendingPayout.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' })
    });
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      console.error('❌ Update failed:', updateResponse.status, error);
      return;
    }
    
    const updated = await updateResponse.json();
    console.log('✅ Update successful:', updated);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Run the test
testUpdate();
