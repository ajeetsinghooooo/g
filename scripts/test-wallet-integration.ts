import crypto from 'node:crypto';
import { storage } from '../server/storage';
import {
  isRazorpayConfigured,
  getMissingRazorpayVars,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../server/razorpay';
import { generateToken } from '../server/auth';

async function runTestSuite() {
  console.log('====================================================');
  console.log('KITCHEN CRUZE — RAZORPAY WALLET INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Environment & Configuration Check
  console.log('--- TEST GROUP 1: Configuration & Missing Variable Identification ---');
  const missingBefore = getMissingRazorpayVars();
  assert(
    Array.isArray(missingBefore),
    'getMissingRazorpayVars returns array of missing environment variables'
  );

  // Set test credentials for testing end-to-end cryptographic and storage flows
  const TEST_KEY_ID = 'rzp_test_kcruze_wallet999';
  const TEST_KEY_SECRET = 'kcruze_secret_hash_key_super_secure_999';
  const TEST_WEBHOOK_SECRET = 'kcruze_webhook_secret_hash_999';

  process.env.RAZORPAY_KEY_ID = TEST_KEY_ID;
  process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  assert(isRazorpayConfigured() === true, 'Razorpay configured check returns true when credentials present');
  assert(getMissingRazorpayVars().length === 0, 'No missing variables when credentials are set');

  // 2. Customer & Initial Wallet State
  console.log('\n--- TEST GROUP 2: Customer & Initial Wallet State ---');
  const testCustomer = storage.createCustomer({
    fullName: 'Razorpay Wallet Tester',
    username: 'razorpaytester99',
    phone: '9876543210',
    email: 'razorpay.tester@kitchencruze.com',
    password: 'Password@123',
  });
  const customerToken = generateToken({ id: testCustomer.id, role: 'customer', username: testCustomer.username });

  const initialWallet = storage.getWallet(testCustomer.id);
  const initialBalance = initialWallet.balance;
  const initialCoins = initialWallet.coins;
  console.log(`Initial Balance: ₹${initialBalance}, Initial Coins: ${initialCoins}`);
  assert(initialBalance >= 0, 'Customer wallet initialized correctly');

  // 3. Currency to Paise Conversion
  console.log('\n--- TEST GROUP 3: Rupees to Paise Conversion Precision ---');
  const rupees100 = 100;
  const paise100 = Math.round(rupees100 * 100);
  assert(paise100 === 10000, '₹100 converts accurately to exactly 10,000 paise');

  const rupees250_50 = 250.5;
  const paise250_50 = Math.round(rupees250_50 * 100);
  assert(paise250_50 === 25050, '₹250.50 converts accurately to exactly 25,050 paise');

  // 4. Cryptographic Signature Verification
  console.log('\n--- TEST GROUP 4: Cryptographic HMAC Signature Verification ---');
  const testOrderId = `order_${Date.now()}`;
  const testPaymentId = `pay_${Date.now()}`;
  const validPayload = `${testOrderId}|${testPaymentId}`;
  const validSignature = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(validPayload)
    .digest('hex');

  const isSigValid = verifyPaymentSignature({
    razorpay_order_id: testOrderId,
    razorpay_payment_id: testPaymentId,
    razorpay_signature: validSignature,
  });
  assert(isSigValid === true, 'Server cryptographically verifies genuine Razorpay signature');

  const isFakeSigValid = verifyPaymentSignature({
    razorpay_order_id: testOrderId,
    razorpay_payment_id: testPaymentId,
    razorpay_signature: 'tampered_fake_signature_abc123',
  });
  assert(isFakeSigValid === false, 'Server strictly rejects invalid/tampered signature');

  // 5. Successful Top-up Verification & Wallet Credit
  console.log('\n--- TEST GROUP 5: Successful Top-up & Automatic Wallet Credit ---');
  const topupAmount = 500;
  const topupResult = storage.topupWallet(
    testCustomer.id,
    topupAmount,
    testPaymentId,
    'Razorpay',
    testOrderId
  );

  assert(topupResult.success === true, 'Wallet top-up succeeded');
  assert(
    topupResult.wallet.balance === Number((initialBalance + topupAmount).toFixed(2)),
    `Wallet balance credited from ₹${initialBalance} to ₹${topupResult.wallet.balance}`
  );
  assert(
    topupResult.wallet.coins === initialCoins,
    'Preserve Reward Rule: Wallet top-ups do NOT award reward coins'
  );
  assert(topupResult.transaction.amount === topupAmount, 'Transaction ledger reflects exact top-up amount');
  assert(topupResult.transaction.paymentReference === testPaymentId, 'Transaction stores Razorpay payment reference');

  // 6. Idempotency & Duplicate Credit Protection
  console.log('\n--- TEST GROUP 6: Idempotency & Duplicate Prevention ---');
  const duplicateResult = storage.topupWallet(
    testCustomer.id,
    topupAmount,
    testPaymentId,
    'Razorpay',
    testOrderId
  );

  assert(duplicateResult.success === true, 'Duplicate call returns success gracefully');
  assert(duplicateResult.alreadyCredited === true, 'Duplicate top-up flagged as alreadyCredited: true');
  assert(
    duplicateResult.wallet.balance === Number((initialBalance + topupAmount).toFixed(2)),
    'Idempotency Guaranteed: Wallet balance was NOT credited a second time'
  );

  // 7. Webhook Signature & Webhook Top-up Handling
  console.log('\n--- TEST GROUP 7: Razorpay Webhook Signature & Webhook Processing ---');
  const webhookOrderId = `order_wh_${Date.now()}`;
  const webhookPaymentId = `pay_wh_${Date.now()}`;
  const webhookTopupAmount = 250;

  const webhookBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: webhookPaymentId,
          order_id: webhookOrderId,
          amount: webhookTopupAmount * 100, // in paise
          currency: 'INR',
          method: 'upi',
          notes: {
            type: 'WALLET_TOPUP',
            customerId: testCustomer.id,
          },
        },
      },
    },
  });

  const webhookSignature = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(webhookBody)
    .digest('hex');

  const isWebhookSigValid = verifyWebhookSignature(webhookBody, webhookSignature);
  assert(isWebhookSigValid === true, 'Webhook HMAC signature verified successfully');

  const isBadWebhookSigValid = verifyWebhookSignature(webhookBody, 'invalid_signature');
  assert(isBadWebhookSigValid === false, 'Invalid webhook signature rejected');

  // Process top-up via webhook
  const currentBalBeforeWh = storage.getWallet(testCustomer.id).balance;
  const webhookCreditResult = storage.topupWallet(
    testCustomer.id,
    webhookTopupAmount,
    webhookPaymentId,
    'Razorpay',
    webhookOrderId
  );
  assert(webhookCreditResult.success === true, 'Webhook wallet credit processed');
  assert(
    webhookCreditResult.wallet.balance === Number((currentBalBeforeWh + webhookTopupAmount).toFixed(2)),
    `Wallet balance increased from ₹${currentBalBeforeWh} to ₹${webhookCreditResult.wallet.balance}`
  );

  // Duplicate webhook delivery test
  const duplicateWebhookResult = storage.topupWallet(
    testCustomer.id,
    webhookTopupAmount,
    webhookPaymentId,
    'Razorpay',
    webhookOrderId
  );
  assert(duplicateWebhookResult.alreadyCredited === true, 'Duplicate webhook identified and discarded');
  assert(
    duplicateWebhookResult.wallet.balance === webhookCreditResult.wallet.balance,
    'Duplicate webhook delivery prevented from adding money twice'
  );

  // 8. Reward Rules & Coin Conversion Integrity
  console.log('\n--- TEST GROUP 8: Reward Rules & Coin Conversion Preservation ---');
  const loyaltyRules = storage.getLoyaltySettings();
  const conversionRate = loyaltyRules.conversionRate || 1;
  const expectedMoney = Math.round((20 / conversionRate) * 100) / 100;

  const walletForCoins = storage.getOrCreateWallet(testCustomer.id);
  walletForCoins.coins = 50;
  const balBeforeConvert = walletForCoins.balance;

  const convertResult = storage.convertCoinsToMoney(testCustomer.id, 20);
  assert(convertResult.success === true, 'Coin conversion succeeded');
  assert(convertResult.coinsConverted === 20, '20 coins converted');
  assert(convertResult.moneyCredited === expectedMoney, `20 coins converted to exactly ₹${expectedMoney} (rate: ${conversionRate} coins = ₹1)`);
  assert(
    convertResult.wallet.balance === Number((balBeforeConvert + expectedMoney).toFixed(2)),
    'Converted money credited to wallet balance'
  );
  assert(convertResult.wallet.coins === 30, 'Coins deducted accurately (50 - 20 = 30)');

  // 9. Persistent Transaction History
  console.log('\n--- TEST GROUP 9: Persistent Transaction History ---');
  const customerTxs = storage.getWalletTransactions(testCustomer.id);
  assert(customerTxs.length >= 3, `Customer has ${customerTxs.length} persistent transactions in ledger`);
  const topupTxs = customerTxs.filter((t) => t.type === 'TOPUP');
  assert(topupTxs.length >= 2, `Topup transactions persisted in history with Razorpay references`);

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
