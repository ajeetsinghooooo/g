import Razorpay from 'razorpay';
import crypto from 'node:crypto';

/**
 * Returns an initialized Razorpay instance or null if credentials are not configured.
 * Uses environment variables:
 * - process.env.RAZORPAY_KEY_ID
 * - process.env.RAZORPAY_KEY_SECRET
 */
export function getRazorpayClient(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!key_id || !key_secret) {
    return null;
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
}

/**
 * Checks whether Razorpay credentials are fully configured on the server.
 */
export function isRazorpayConfigured(): boolean {
  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return Boolean(key_id && key_secret);
}

/**
 * Returns the list of missing environment variable names for Razorpay configuration.
 */
export function getMissingRazorpayVars(): string[] {
  const missing: string[] = [];
  if (!process.env.RAZORPAY_KEY_ID?.trim()) missing.push('RAZORPAY_KEY_ID');
  if (!process.env.RAZORPAY_KEY_SECRET?.trim()) missing.push('RAZORPAY_KEY_SECRET');
  return missing;
}

/**
 * Returns the public Razorpay Key ID (safe to share with client for Checkout modal).
 */
export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID?.trim() || null;
}

/**
 * Verifies Razorpay Payment Signature on the server using RAZORPAY_KEY_SECRET.
 * Algorithm: HMAC_SHA256(order_id + "|" + payment_id, secret) === signature
 */
export function verifyPaymentSignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) {
    console.error('[Razorpay Security] RAZORPAY_KEY_SECRET is not configured on the server.');
    return false;
  }

  if (!params.razorpay_order_id || !params.razorpay_payment_id || !params.razorpay_signature) {
    return false;
  }

  try {
    const payload = `${params.razorpay_order_id.trim()}|${params.razorpay_payment_id.trim()}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const signatureBuf = Buffer.from(params.razorpay_signature.trim(), 'utf-8');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    console.error('[Razorpay Security] Signature verification error:', err);
    return false;
  }
}

/**
 * Verifies Razorpay Webhook Signature on the server using RAZORPAY_WEBHOOK_SECRET.
 * Algorithm: HMAC_SHA256(rawBody, webhook_secret) === signature
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[Razorpay Security] RAZORPAY_WEBHOOK_SECRET is not configured on the server.');
    return false;
  }

  if (!rawBody || !signature) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
    const signatureBuf = Buffer.from(signature.trim(), 'utf-8');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  } catch (err) {
    console.error('[Razorpay Security] Webhook signature verification error:', err);
    return false;
  }
}
