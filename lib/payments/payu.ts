import crypto from "crypto";

function getPayU() {
  const key = process.env.PAYU_MERCHANT_KEY;
  const salt = process.env.PAYU_MERCHANT_SALT;
  const paymentUrl = process.env.PAYU_PAYMENT_URL;
  const verifyUrl = process.env.PAYU_VERIFY_URL;

  if (!key || !salt || !paymentUrl || !verifyUrl) {
    throw new Error(
      "PayU configuration is missing. Set PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, PAYU_PAYMENT_URL and PAYU_VERIFY_URL."
    );
  }

  return { key, salt, paymentUrl, verifyUrl };
}

export function payuConfig() {
  return getPayU();
}

// Retail checkout is PayU-only. When the merchant credentials are not configured the
// retail surfaces show "online payment unavailable" - they never fall back to Cash.
export function payuReady() {
  return Boolean(process.env.PAYU_MERCHANT_KEY && process.env.PAYU_MERCHANT_SALT && process.env.PAYU_PAYMENT_URL && process.env.PAYU_VERIFY_URL);
}

function sha512(input: string) {
  return crypto.createHash("sha512").update(input).digest("hex");
}

type HashFields = {
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  // We only ever populate udf1 (checkout platform: "web" | "mobile"). udf2-5 are
  // always empty, but PayU still includes their (empty) slots in the hash.
  udf1?: string;
};

// Official PayU Hosted Checkout request hash (docs.payu.in/docs/generate-hash-payu-hosted):
// sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|||||SALT)
// udf1 MUST be the exact value sent in the form - PayU recomputes the hash from what it
// actually receives, so hashing "" while sending a non-empty udf1 makes every online
// payment fail with an invalid-hash error.
export function buildRequestHash(fields: HashFields) {
  const { key, salt } = getPayU();
  const { txnid, amount, productinfo, firstname, email, udf1 = "" } = fields;
  const raw = [key, txnid, amount, productinfo, firstname, email, udf1, "", "", "", "", "", "", "", "", "", salt].join("|");
  return sha512(raw);
}

// Official PayU reverse hash (same doc, "Response Hash"):
// sha512(SALT|status|||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
// udf1 here must be the value PayU echoes back in its response, in the slot immediately
// before email (udf2-5 and the 5 reserved slots stay empty since we never set them).
export function verifyResponseHash(fields: HashFields & { status: string; hash: string }) {
  const { key, salt } = getPayU();
  const { txnid, amount, productinfo, firstname, email, status, hash, udf1 = "" } = fields;
  const raw = [salt, status, "", "", "", "", "", "", "", "", udf1, email, firstname, productinfo, amount, txnid, key].join("|");
  const expected = sha512(raw);
  if (expected.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}

export function buildPaymentForm(fields: HashFields & { surl: string; furl: string; udf1?: string }) {
  const { key, paymentUrl } = getPayU();
  const hash = buildRequestHash(fields);
  return {
    action: paymentUrl,
    fields: {
      key,
      txnid: fields.txnid,
      amount: fields.amount,
      productinfo: fields.productinfo,
      firstname: fields.firstname,
      email: fields.email,
      surl: fields.surl,
      furl: fields.furl,
      udf1: fields.udf1 || "",
      hash,
    },
  };
}

export type PayUVerifyResult = {
  txnid: string;
  status: string;
  mihpayid: string | null;
  amount: string | null;
  mode: string | null;
};

export async function verifyPaymentServerSide(txnid: string): Promise<PayUVerifyResult> {
  const { key, salt, verifyUrl } = getPayU();
  const hash = sha512(`${key}|verify_payment|${txnid}|${salt}`);

  const body = new URLSearchParams({
    key,
    command: "verify_payment",
    var1: txnid,
    hash,
  });

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`PayU verify_payment request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const detail = payload?.transaction_details?.[txnid];

  if (!detail) {
    throw new Error("PayU did not return transaction details for this transaction.");
  }

  return {
    txnid,
    status: String(detail.status || "").toLowerCase(),
    mihpayid: detail.mihpayid || null,
    amount: detail.amt != null ? String(detail.amt) : null,
    mode: detail.mode ? String(detail.mode).toUpperCase() : null,
  };
}

export function payuInstrumentToPaymentMethod(mode: string | null): "UPI" | "CARD" | "NET_BANKING" | null {
  if (!mode) return null;
  if (mode === "UPI") return "UPI";
  if (mode === "CC" || mode === "DC" || mode === "CARD") return "CARD";
  if (mode === "NB" || mode === "NET_BANKING") return "NET_BANKING";
  return null;
}
