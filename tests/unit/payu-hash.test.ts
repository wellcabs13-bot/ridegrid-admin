// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "crypto";
import { buildRequestHash, verifyResponseHash, buildPaymentForm } from "@/lib/payments/payu";

// Verified against docs.payu.in/docs/generate-hash-payu-hosted (PayU India Hosted
// Checkout), September 2026:
//   Request:  sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5|||||SALT)
//   Response: sha512(SALT|status|||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
// Both formulas carry 5 udf slots (we only ever populate udf1) plus 5 further
// always-empty reserved slots between udf5 and SALT/status.

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

function officialRequestHash(udf1: string) {
  const raw = [
    ENV.PAYU_MERCHANT_KEY, fields.txnid, fields.amount, fields.productinfo, fields.firstname, fields.email,
    udf1, "", "", "", "", "", "", "", "", "",
    ENV.PAYU_MERCHANT_SALT,
  ].join("|");
  return crypto.createHash("sha512").update(raw).digest("hex");
}

function officialResponseHash(status: string, udf1: string) {
  const raw = [
    ENV.PAYU_MERCHANT_SALT, status, "", "", "", "", "", "", "", "",
    udf1, fields.email, fields.firstname, fields.productinfo, fields.amount, fields.txnid, ENV.PAYU_MERCHANT_KEY,
  ].join("|");
  return crypto.createHash("sha512").update(raw).digest("hex");
}

describe("payu request hash", () => {
  it("matches the official formula when udf1 is empty", () => {
    expect(buildRequestHash(fields)).toBe(officialRequestHash(""));
  });

  it("matches the official formula when udf1 is a real, non-empty value (web)", () => {
    expect(buildRequestHash({ ...fields, udf1: "web" })).toBe(officialRequestHash("web"));
  });

  it("matches the official formula when udf1 is a real, non-empty value (mobile)", () => {
    expect(buildRequestHash({ ...fields, udf1: "mobile" })).toBe(officialRequestHash("mobile"));
  });

  it("produces a different hash for different udf1 values (proves udf1 is actually mixed in)", () => {
    expect(buildRequestHash({ ...fields, udf1: "web" })).not.toBe(buildRequestHash({ ...fields, udf1: "mobile" }));
    expect(buildRequestHash({ ...fields, udf1: "web" })).not.toBe(buildRequestHash(fields));
  });
});

describe("payu response (reverse) hash", () => {
  it("verifies correctly when udf1 is empty", () => {
    const hash = officialResponseHash("success", "");
    expect(verifyResponseHash({ ...fields, status: "success", hash })).toBe(true);
  });

  it("verifies correctly when udf1 is a real, non-empty value (web)", () => {
    const hash = officialResponseHash("success", "web");
    expect(verifyResponseHash({ ...fields, status: "success", udf1: "web", hash })).toBe(true);
  });

  it("verifies correctly when udf1 is a real, non-empty value (mobile)", () => {
    const hash = officialResponseHash("failure", "mobile");
    expect(verifyResponseHash({ ...fields, status: "failure", udf1: "mobile", hash })).toBe(true);
  });

  it("rejects when the caller's udf1 does not match what was actually hashed", () => {
    const hash = officialResponseHash("success", "web");
    // A hash computed for udf1="web" must not verify against udf1="mobile" - this is
    // exactly the bug where the hash silently ignored the real udf1 value.
    expect(verifyResponseHash({ ...fields, status: "success", udf1: "mobile", hash })).toBe(false);
  });

  it("rejects a tampered reverse hash", () => {
    expect(
      verifyResponseHash({ ...fields, status: "success", hash: "0".repeat(128) })
    ).toBe(false);
  });
});

describe("payu payment form", () => {
  it("builds a form pointing at the configured PayU URL with a hash matching the sent udf1", () => {
    const form = buildPaymentForm({ ...fields, surl: "https://ridegrid.test/return", furl: "https://ridegrid.test/return", udf1: "mobile" });
    expect(form.action).toBe(ENV.PAYU_PAYMENT_URL);
    expect(form.fields.key).toBe(ENV.PAYU_MERCHANT_KEY);
    expect(form.fields.txnid).toBe(fields.txnid);
    expect(form.fields.udf1).toBe("mobile");
    expect(form.fields.hash).toBe(officialRequestHash("mobile"));
    expect(form.fields.hash).toHaveLength(128);
  });
});
