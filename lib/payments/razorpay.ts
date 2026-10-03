import Razorpay from "razorpay";
import crypto from "crypto";

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      "Razorpay configuration is missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
    );
  }

  return {
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    }),
    keyId,
    keySecret,
  };
}

export function razorpayClient() {
  return getRazorpay().client;
}

export function razorpayKeyId() {
  return getRazorpay().keyId;
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
) {
  const { keySecret } = getRazorpay();

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string
) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "RAZORPAY_WEBHOOK_SECRET is not configured."
    );
  }

  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature),
    Buffer.from(signature)
  );
}
