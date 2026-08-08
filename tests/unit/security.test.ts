import {
  describe,
  expect,
  it,
} from "vitest";

import {
  encryptionService,
} from "@/lib/security/encryption";

import {
  hasPermission,
} from "@/lib/security/permissions";

import {
  SecurityRole,
  PermissionAction,
} from "@/types/security";

describe("RideGrid Security", () => {
  it("hashes and verifies passwords", async () => {
    const password =
      "RideGrid@2026";

    const hash =
      await encryptionService.hash(
        password
      );

    expect(hash).not.toBe(
      password
    );

    await expect(
      encryptionService.verify(
        password,
        hash
      )
    ).resolves.toBe(true);

    await expect(
      encryptionService.verify(
        "WrongPassword@2026",
        hash
      )
    ).resolves.toBe(false);
  });

  it("generates secure token", () => {
    const token =
      encryptionService.generateToken(
        64
      );

    expect(token).toHaveLength(64);
    expect(typeof token).toBe(
      "string"
    );
  });

  it("generates numeric OTP", () => {
    const otp =
      encryptionService.generateOTP(
        6
      );

    expect(otp).toMatch(
      /^\d{6}$/
    );
  });

  it("allows Super Admin to manage security", () => {
    expect(
      hasPermission(
        SecurityRole.SUPER_ADMIN,
        "security",
        PermissionAction.MANAGE
      )
    ).toBe(true);
  });
});