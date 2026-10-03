import { describe, expect, it } from "vitest";
import { generateOTP, hashSecurityToken, verifySecurityToken } from "@/lib/services/security/MFAService";
import { validateKYCSubmission, canOperateWithKYC } from "@/lib/services/compliance/KYCService";

describe("P6.1 Security + Compliance", () => {
  it("generates six digit MFA OTP", () => {
    expect(generateOTP()).toMatch(/^\d{6}$/);
  });

  it("hashes and verifies security tokens", () => {
    const hash = hashSecurityToken("ridegrid-test");
    expect(verifySecurityToken("ridegrid-test", hash)).toBe(true);
    expect(verifySecurityToken("wrong", hash)).toBe(false);
  });

  it("validates KYC submissions", () => {
    expect(validateKYCSubmission({
      documentType: "IDENTITY",
      documentNumber: "TEST123",
      holderName: "Test User",
    }).status).toBe("PENDING");
  });

  it("allows operation only after KYC verification", () => {
    expect(canOperateWithKYC("VERIFIED")).toBe(true);
    expect(canOperateWithKYC("PENDING")).toBe(false);
  });
});