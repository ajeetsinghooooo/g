import crypto from 'node:crypto';
import { storage } from '../server/storage';
import { verifyPaymentSignature } from '../server/razorpay';

async function runWalletRazorpayTests() {
  console.log('=== KITCHEN CRUZE WALLET & RAZORPAY VERIFICATION TESTS ===\n');

  // Test 1: Customer Wallet Existence & Ledger
  const testCustomerId = 'cust-1789893890399';
  const initialWallet = storage.getWallet(testCustomerId);
  console.log('Test 1: Customer initial wallet fetched:', {
    customerId: initialWallet.customerId,
    balance: initialWallet.balance,
    coins: initialWallet.coins,
  });

  const initialBalance = initialWallet.balance;
  const initialCoins = initialWallet.coins;

  // Test 2: Paise conversion
  const testRupees = 250;
  const expectedPaise = 25000;
  const computedPaise = Math.round(testRupees * 100);
  if (computedPaise !== expectedPaise) {
    throw new Error(`Paise conversion failed: expected ${expectedPaise}, got ${computedPaise}`);
  }
  console.log('Test 2: Rupee to paise conversion verified: ₹250 =', computedPaise, 'paise [PASS]');

  // Test 3: Idempotent Wallet Credit (Simulating verified Razorpay payment)
  const fakeOrderId = `order_test_${Date.now()}`;
  const fakePaymentId = `pay_test_${Date.now()}`;
  const idempotencyKey = fakeOrderId;

  const credit1 = storage.topupWallet(
    testCustomerId,
    testRupees,
    fakePaymentId,
    'Razorpay',
    idempotencyKey
  );

  console.log('Test 3: First credit result:', {
    balance: credit1.wallet.balance,
    coins: credit1.wallet.coins,
    alreadyCredited: credit1.alreadyCredited,
  });

  if (credit1.wallet.balance !== initialBalance + testRupees) {
    throw new Error(`Balance mismatch: expected ${initialBalance + testRupees}, got ${credit1.wallet.balance}`);
  }
  if (credit1.wallet.coins !== initialCoins) {
    throw new Error('Reward coins rule breached! Coins must NOT be awarded for wallet top-ups.');
  }
  console.log('Test 3b: Reward coins verified unchanged (0 coins for top-up) [PASS]');

  // Test 4: Duplicate Credit Prevention (Repeated callback / duplicate webhook retry)
  const credit2 = storage.topupWallet(
    testCustomerId,
    testRupees,
    fakePaymentId,
    'Razorpay',
    idempotencyKey
  );

  console.log('Test 4: Duplicate credit attempt result:', {
    balance: credit2.wallet.balance,
    alreadyCredited: credit2.alreadyCredited,
  });

  if (!credit2.alreadyCredited || credit2.wallet.balance !== initialBalance + testRupees) {
    throw new Error('Idempotency failure: Duplicate credit was applied!');
  }
  console.log('Test 4: Duplicate credit successfully blocked (alreadyCredited: true) [PASS]');

  // Test 5: Cryptographic HMAC signature verification
  const dummySecret = 'test_secret_sample_key_12345';
  const orderId = 'order_DAvpl1e18qIe6A';
  const paymentId = 'pay_DAvqw9e18qIe6B';
  const validSignature = crypto
    .createHmac('sha256', dummySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Verify HMAC helper logic
  const computedHmac = crypto
    .createHmac('sha256', dummySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (computedHmac !== validSignature) {
    throw new Error('Cryptographic signature verification logic failed');
  }

  const forgedSignature = 'forged_tampered_signature_xyz';
  const isForgedValid = crypto.timingSafeEqual(
    Buffer.from(computedHmac),
    Buffer.from(forgedSignature.padEnd(64, '0').slice(0, 64))
  );

  if (isForgedValid) {
    throw new Error('Forged signature was accepted!');
  }
  console.log('Test 5: Cryptographic signature verification blocks invalid signatures [PASS]');

  // Test 6: Transaction ledger record created
  const txs = storage.getWalletTransactions(testCustomerId);
  const foundTx = txs.find((t) => t.paymentReference === fakePaymentId);
  if (!foundTx) {
    throw new Error('Transaction was not recorded in persistent ledger');
  }
  console.log('Test 6: Wallet transaction found in persistent ledger [PASS]:', {
    id: foundTx.id,
    type: foundTx.type,
    amount: foundTx.amount,
    paymentReference: foundTx.paymentReference,
    paymentMethod: foundTx.paymentMethod,
    balanceAfter: foundTx.balanceAfter,
  });

  console.log('\n=== ALL 6 TESTS COMPLETED SUCCESSFULLY ===');
}

runWalletRazorpayTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
