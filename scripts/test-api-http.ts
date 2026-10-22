import { generateToken } from '../server/auth';

async function testHttpEndpoints() {
  console.log('=== TESTING API HTTP RESPONSES & ERROR GUARDS ===\n');

  const baseUrl = 'http://localhost:3000';
  const token = generateToken({
    id: 'cust-1789893890399',
    role: 'customer',
    username: 'ajeetsingh89809',
    email: 'ajeetsingh89809@gmail.com',
  });

  // 1. Unauthenticated request to /api/customer/wallet
  const res1 = await fetch(`${baseUrl}/api/customer/wallet`);
  const data1 = await res1.json();
  if (res1.status !== 401 || !data1.error) {
    throw new Error('Expected 401 for unauthenticated wallet access');
  }
  console.log('Test 1: Unauthenticated wallet returns 401 JSON [PASS]');

  // 2. Authenticated request to /api/customer/wallet
  const res2 = await fetch(`${baseUrl}/api/customer/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data2 = await res2.json();
  if (res2.status !== 200 || !data2.wallet) {
    throw new Error('Expected 200 with wallet object for authenticated customer');
  }
  console.log('Test 2: Authenticated customer wallet returns 200 JSON with wallet & rules [PASS]');

  // 3. Unknown API route returns JSON (never index.html doctype)
  const res3 = await fetch(`${baseUrl}/api/nonexistent-endpoint-test-12345`);
  const contentType3 = res3.headers.get('content-type') || '';
  const data3 = await res3.json();
  if (!contentType3.includes('application/json') || res3.status !== 404 || !data3.error) {
    throw new Error('API 404 guard failed to return JSON');
  }
  console.log('Test 3: API 404 guard returns strict JSON (never HTML doctype) [PASS]');

  // 4. Missing parameters verification
  const res4 = await fetch(`${baseUrl}/api/customer/wallet/topup/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount: 100 }),
  });
  const data4 = await res4.json();
  if (res4.status !== 400 || !data4.error.includes('Missing required Razorpay payment verification parameters')) {
    throw new Error('Expected 400 with missing verification parameters message');
  }
  console.log('Test 4: Verify without signatures correctly rejected with 400 JSON [PASS]');

  // 5. Forged cryptographic signature rejection
  const res5 = await fetch(`${baseUrl}/api/customer/wallet/topup/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      amount: 100,
      topupId: 'TOPUP-TEST-123',
      razorpay_order_id: 'order_test_123',
      razorpay_payment_id: 'pay_test_456',
      razorpay_signature: 'fake_tampered_signature_789',
    }),
  });
  const data5 = await res5.json();
  if (res5.status !== 400 || !data5.error.includes('Cryptographic signature verification failed')) {
    throw new Error('Expected 400 for forged signature');
  }
  console.log('Test 5: Forged Razorpay signature rejected securely [PASS]');

  // 6. Webhook with invalid signature
  const res6 = await fetch(`${baseUrl}/api/webhook/razorpay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': 'invalid_signature_xyz',
    },
    body: JSON.stringify({ event: 'payment.captured' }),
  });
  const data6 = await res6.json();
  if (res6.status !== 400 || !data6.error.includes('signature')) {
    throw new Error('Webhook invalid signature not rejected');
  }
  console.log('Test 6: Webhook endpoint verifies cryptographic signature and rejects forged payloads [PASS]');

  console.log('\n=== ALL HTTP API TESTS PASSED SUCCESSFULLY ===');
}

testHttpEndpoints().catch((err) => {
  console.error('HTTP Test failed:', err);
  process.exit(1);
});
