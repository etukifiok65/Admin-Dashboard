#!/usr/bin/env node

import https from 'https';

const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('Missing required env var: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

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

async function testWithdrawals() {
  try {
    console.log('🔍 Fetching provider withdrawals...');
    const withdrawn = await supabaseRequest('GET', '/provider_withdrawals?select=id,provider_id,status,amount');
    console.log(`✅ Found ${withdrawn.data.length} withdrawals:`);
    withdrawn.data.forEach((w, i) => {
      console.log(`  ${i + 1}. ID: ${w.id.substring(0, 8)}... | Status: ${w.status} | Amount: ${w.amount}`);
    });

    if (withdrawn.data.length > 0) {
      const pendingWithdraw = withdrawn.data.find(w => w.status === 'Pending');
      if (pendingWithdraw) {
        console.log(`\n📝 Testing UPDATE on pending withdrawal: ${pendingWithdraw.id.substring(0, 8)}...`);
        
        const updateRes = await supabaseRequest('PATCH', `/provider_withdrawals?id=eq.${pendingWithdraw.id}`, {
          status: 'Paid',
          processed_at: new Date().toISOString()
        });
        
        if (updateRes.status === 200) {
          console.log(`✅ UPDATE succeeded! Response:`, updateRes.data);
        } else {
          console.log(`❌ UPDATE failed with status ${updateRes.status}:`, updateRes.data);
        }
      } else {
        console.log('⚠️ No pending withdrawals found to test UPDATE');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testWithdrawals();
