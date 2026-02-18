#!/usr/bin/env node

import https from 'https';

const SUPABASE_URL = 'https://spjqtdxnspndnnluayxp.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Helper function to make HTTPS requests
function supabaseRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'spjqtdxnspndnnluayxp.supabase.co',
      port: 443,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function insertTestData() {
  try {
    console.log('🔍 Fetching existing providers...');
    const providersRes = await supabaseRequest('GET', '/providers?select=id,name&limit=3');
    const providers = providersRes.data || [];
    
    if (providers.length === 0) {
      console.error('❌ No providers found in database');
      return;
    }

    console.log(`✅ Found ${providers.length} providers:`, providers.map(p => p.name).join(', '));

    // Insert payment methods for each provider
    console.log('\n📝 Inserting payment methods...');

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const methodType = i === 0 ? 'bank_account' : 'mobile_money';
      const bankName = i === 0 ? 'First Bank' : i === 1 ? 'MTN Mobile' : 'Airtel Mobile';
      const accountNum = String(Math.floor(Math.random() * 9000000000) + 1000000000);

      const method = {
        provider_id: provider.id,
        method_type: methodType,
        account_name: `Test Account - ${provider.name}`,
        account_number: accountNum.padStart(10, '0'),
        bank_code: i === 0 ? 'FB' : null,
        bank_name: bankName,
        is_default: true,
        verified: true,
      };

      const methodRes = await supabaseRequest('POST', '/provider_payout_methods', method);
      if (methodRes.status === 201) {
        console.log(`✅ Created payment method for ${provider.name}`);
      } else {
        console.log(`⚠️ Failed to create payment method: ${methodRes.status}`, methodRes.data);
      }
    }

    // Fetch all payment methods we just created
    console.log('\n🔍 Fetching created payment methods...');
    const methodsRes = await supabaseRequest('GET', '/provider_payout_methods?select=id,provider_id');
    const allMethods = methodsRes.data || [];
    console.log(`✅ Found ${allMethods.length} payment methods`);

    // Insert withdrawal requests using the fetched methods
    console.log('\n📝 Inserting withdrawal requests...');
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const method = allMethods.find((m) => m.provider_id === provider.id);
      
      if (!method) {
        console.log(`⚠️ Skipping withdrawal for ${provider.name} (no method)`);
        continue;
      }

      const withdrawal = {
        provider_id: provider.id,
        payout_method_id: method.id,
        amount: (5000 + Math.random() * 2000).toFixed(2),
        status: i % 2 === 0 ? 'Pending' : 'Paid',
        requested_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        processed_at: i % 2 === 0 ? null : new Date().toISOString(),
        admin_note: `Test withdrawal request for ${provider.name}`,
      };

      const withdrawRes = await supabaseRequest('POST', '/provider_withdrawals', withdrawal);
      if (withdrawRes.status === 201) {
        console.log(`✅ Created ${withdrawal.status.toLowerCase()} withdrawal for ${provider.name}`);
      } else {
        console.log(`⚠️ Failed to create withdrawal: ${withdrawRes.status}`, withdrawRes.data);
      }
    }

    console.log('\n✅ Test data insertion complete!');
    console.log('You can now test the "Mark as Paid" button on the Financial page.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

insertTestData();
