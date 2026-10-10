// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { identifierWhere, mobileVariants, normalizeMobile, parseRole } from "@/lib/auth/identity";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

describe("role-scoped login identity", () => {
  it("normalises Indian mobile numbers to 10 digits", () => {
    for (const raw of ["9876543210", "+919876543210", "919876543210", "+91 98765 43210", "09876543210"])
      expect(normalizeMobile(raw)).toBe("9876543210");
    expect(normalizeMobile("")).toBeNull();
    expect(normalizeMobile("+1 415 555 0100")).toBe("+14155550100");
  });

  it("matches legacy stored spellings of a mobile number", () => {
    expect(mobileVariants("+91 98765 43210")).toEqual(expect.arrayContaining(["9876543210", "+919876543210", "+91 9876543210"]));
    expect(identifierWhere("98765 43210")).toEqual({ mobile: { in: mobileVariants("9876543210") } });
    expect(identifierWhere(" User@Example.com ")).toEqual({ email: { equals: "user@example.com", mode: "insensitive" } });
  });

  it("accepts only known roles", () => {
    expect(parseRole("VENDOR")).toBe("VENDOR");
    expect(parseRole("ROOT")).toBeUndefined();
  });

  it("replaces global email/mobile uniqueness with per-role partial unique indexes", () => {
    const sql = read("prisma/migrations/20261001000000_role_scoped_identity/migration.sql");
    expect(sql).toMatch(/DROP INDEX IF EXISTS "User_email_key"/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "User_role_email_active_key" ON "User"\("role", lower\("email"\)\) WHERE "deletedAt" IS NULL/);
    expect(sql).toMatch(/CREATE UNIQUE INDEX "User_role_mobile_active_key"/);
    expect(sql).toMatch(/ADD COLUMN "mustChangePassword"/);
  });

  it("login issues no session while a temporary password is in use", () => {
    const auth = read("lib/auth/auth.ts");
    expect(auth).toMatch(/if \(user\.mustChangePassword\)[\s\S]*passwordChangeRequired: true/);
    expect(read("app/api/auth/reset-password/route.ts")).toMatch(/mustChangePassword: false/);
  });

  it("provisioned accounts get a unique temporary password and must change it", () => {
    for (const file of ["app/api/vendors/route.ts", "lib/vendor-mobile/write.ts", "app/api/drivers/route.ts", "lib/services/admin/CorporateAdminService.ts"]) {
      const src = read(file);
      expect(src).toMatch(/generateTemporaryPassword/);
      expect(src).toMatch(/mustChangePassword: true/);
      expect(src).not.toMatch(/ChangeMe@123/);
    }
  });

  it("each mobile app sends its own role with the identifier", () => {
    const apps: Record<string, string> = {
      "apps/customer-mobile/src/features/auth/AuthScreen.tsx": "CUSTOMER",
      "apps/vendor-mobile/src/screens/Auth.tsx": "VENDOR",
      "apps/driver-mobile/src/screens/Auth.tsx": "DRIVER",
      "apps/corporate-employee-mobile/src/screens/Auth.tsx": "CORPORATE_EMPLOYEE",
    };
    for (const [file, role] of Object.entries(apps)) {
      const src = read(file);
      expect(src).toContain(`"${role}"`);
      expect(src).toMatch(/identifier/);
    }
  });
});
