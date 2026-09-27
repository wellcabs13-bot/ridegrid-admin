// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { buildRequestHash, verifyResponseHash, buildPaymentForm } from "@/lib/payments/payu";

const ENV = {
  PAYU_MERCHANT_KEY: "testkey",
  PAYU_MERCHANT_SALT: "testsalt",
  PAYU_PAYMENT_URL: "https://test.payu.in/_payment",
  PAYU_VERIFY_URL: "https://test.payu.in/merchant/postservice?form=2",
};

const original: Record<string, string | undefined> = {};

beforeAll(() => {
  for (const [k, v] of Object.entries(ENV)) {
    original[k] = process.env[k];
    process.env[k] = v;
  }
});

afterAll(() => {
  for (const [k, v] of Object.entries(original)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

const fields = {
  txnid: "PAYU-RG1001",
  amount: "1500.00",
  productinfo: "RideGrid Booking",
  firstname: "Asha",
  email: "asha@example.com",
};

describe("payu hash", () => {
  it("builds the request hash using the documented field order (key|txnid|amount|productinfo|firstname|email|udf1..udf10|salt)", () => {
    const raw = [
      ENV.PAYU_MERCHANT_KEY,
      fields.txnid,
      fields.amount,
      fields.productinfo,
      fields.firstname,
      fields.email,
      "", "", "", "", "", "", "", "", "", "",
      ENV.PAYU_MERCHANT_SALT,
    ].join("|");
    const expected = crypto.createHash("sha512").update(raw).digest("hex");

    expect(buildRequestHash(fields)).toBe(expected);
  });

  it("verifies a correctly computed reverse hash (salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key)", () => {
    const status = "success";
    const raw = [
      ENV.PAYU_MERCHANT_SALT,
      status,
      "", "", "", "", "", "", "", "", "",
      fields.email,
      fields.firstname,
      fields.productinfo,
      fields.amount,
      fields.txnid,
      ENV.PAYU_MERCHANT_KEY,
    ].join("|");
    const hash = crypto.createHash("sha512").update(raw).digest("hex");

    expect(verifyResponseHash({ ...fields, status, hash })).toBe(true);
  });

  it("rejects a tampered reverse hash", () => {
    expect(
      verifyResponseHash({ ...fields, status: "success", hash: "0".repeat(128) })
    ).toBe(false);
  });

  it("builds a payment form pointing at the configured PayU URL", () => {
    const form = buildPaymentForm({ ...fields, surl: "https://ridegrid.test/return", furl: "https://ridegrid.test/return" });
    expect(form.action).toBe(ENV.PAYU_PAYMENT_URL);
    expect(form.fields.key).toBe(ENV.PAYU_MERCHANT_KEY);
    expect(form.fields.txnid).toBe(fields.txnid);
    expect(form.fields.hash).toHaveLength(128);
  });
});
