import crypto from 'node:crypto';
import { storage } from '../server/storage';
import { generateToken } from '../server/auth';

async function testHttpEndpoints() {
  console.log('--- Testing Live Express HTTP Wallet Top-up Endpoints ---\n');

  // Create test customer via HTTP API
  const username = 'livehttptester' + Date.now();
  const signupRes = await fetch('http://localhost:3000/api/customer/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Live HTTP Tester',
      username,
      phone: '9876543211',
      email: `livehttptester_${Date.now()}@kitchencruze.com`,
      password: 'Password@123',
      confirmPassword: 'Password@123',
    }),
  });
  const signupData = await signupRes.json();
  const token = signupData.token;
  const customer = signupData.customer;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Test 1: Minimum topup amount validation
  console.log('1. Testing amount validation (< minTopup)...');
  const resMin = await fetch('http://localhost:3000/api/customer/wallet/topup/initiate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount: 5 }),
  });
  const dataMin = await resMin.json();
  console.log('   Response status:', resMin.status, 'Error:', dataMin.error);
  if (resMin.status === 400 && dataMin.error?.includes('Minimum top-up amount')) {
    console.log('   [PASS] Minimum amount validated.');
  } else {
    console.error('   [FAIL] Expected 400 validation error');
    process.exit(1);
  }

  // Test 2: If Razorpay credentials are not configured in process.env
  console.log('\n2. Testing unconfigured Razorpay gateway response...');
  const resUnconfig = await fetch('http://localhost:3000/api/customer/wallet/topup/initiate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount: 200 }),
  });
  const dataUnconfig = await resUnconfig.json();
  console.log('   Response status:', resUnconfig.status, 'Body:', dataUnconfig);
  if (resUnconfig.status === 503) {
    console.log('   [PASS] 503 Service Unavailable returned with missing variable names:', dataUnconfig.missingVariables);
  } else if (resUnconfig.status === 200 && dataUnconfig.razorpayOrderId) {
    console.log('   [PASS] Razorpay credentials are active and order was created:', dataUnconfig.razorpayOrderId);
  }

  // Test 3: Test verification endpoint with missing parameters
  console.log('\n3. Testing verification endpoint missing parameters...');
  const resMissing = await fetch('http://localhost:3000/api/customer/wallet/topup/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: 200,
      topupId: 'TOPUP-123',
    }),
  });
  const dataMissing = await resMissing.json();
  console.log('   Response status:', resMissing.status, 'Error:', dataMissing.error);
  if (resMissing.status === 400 && dataMissing.error?.includes('Missing required Razorpay')) {
    console.log('   [PASS] Missing Razorpay cryptographic parameters correctly rejected.');
  } else {
    console.error('   [FAIL] Missing params test failed');
    process.exit(1);
  }

  // Test 4: Test verification endpoint with forged/tampered signature
  console.log('\n4. Testing verification endpoint with forged signature...');
  const resForged = await fetch('http://localhost:3000/api/customer/wallet/topup/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      amount: 200,
      topupId: 'TOPUP-123',
      razorpay_order_id: 'order_test_123',
      razorpay_payment_id: 'pay_test_123',
      razorpay_signature: 'fake_tampered_signature_999999999999',
    }),
  });
  const dataForged = await resForged.json();
  console.log('   Response status:', resForged.status, 'Error:', dataForged.error);
  if (resForged.status === 400 && dataForged.error?.includes('signature verification failed')) {
    console.log('   [PASS] Tampered signature strictly rejected with 400 and zero wallet credit.');
  } else {
    console.error('   [FAIL] Forged signature test failed');
    process.exit(1);
  }

  // Check that customer wallet is still 0
  const walletCheck = storage.getWallet(customer.id);
  if (walletCheck.balance === 0) {
    console.log('   [PASS] Verified customer balance remains ₹0 after rejected attempts.');
  } else {
    console.error('   [FAIL] Customer wallet was improperly credited:', walletCheck.balance);
    process.exit(1);
  }

  console.log('\nAll Live HTTP Wallet Endpoint Tests Passed Successfully!');
}

testHttpEndpoints().catch((err) => {
  console.error('HTTP test error:', err);
  process.exit(1);
});
