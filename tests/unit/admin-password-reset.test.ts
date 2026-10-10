// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  requestUser: vi.fn(),
  issueResetToken: vi.fn(),
  vendor: { findFirst: vi.fn() },
  driver: { findFirst: vi.fn() },
  user: { update: vi.fn(), findMany: vi.fn() },
  refreshToken: { updateMany: vi.fn() },
  passwordResetToken: { updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: m }));
vi.mock("@/lib/auth/account-email", () => ({ issueResetToken: m.issueResetToken }));

import { POST as resetVendor } from "@/app/api/admin/vendors/[id]/reset-password/route";
import { POST as resetDriver } from "@/app/api/admin/drivers/[id]/reset-password/route";
import { authService } from "@/lib/auth/auth";

const req = (path: string) => new NextRequest(`http://localhost${path}`, { method: "POST" });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const account = (role: string, email: string | null, mobile: string | null = null) => ({
  id: "acc-1", user: { id: "user-1", role, email, mobile, isActive: true, deletedAt: null },
});

beforeEach(() => {
  vi.resetAllMocks();
  m.requestUser.mockResolvedValue({ id: "admin-1", role: "SUPER_ADMIN", isActive: true, deletedAt: null });
  m.$transaction.mockImplementation((fn: (tx: typeof m) => unknown) => fn(m));
  m.issueResetToken.mockResolvedValue("change-token");
});

async function resetAndLogin(kind: "VENDOR" | "DRIVER") {
  const res = kind === "VENDOR" ? await resetVendor(req("/api/admin/vendors/acc-1/reset-password"), ctx("acc-1")) : await resetDriver(req("/api/admin/drivers/acc-1/reset-password"), ctx("acc-1"));
  const body = await res.json();
  const update = m.user.update.mock.calls[0][0];
  // The forced-change flow of the Vendor / Driver app: login with the temporary password.
  m.user.findMany.mockResolvedValue([{ id: "user-1", name: "U", email: "u@x.in", mobile: null, role: kind, password: update.data.password, mustChangePassword: true, isActive: true, deletedAt: null, isVerified: true }]);
  const login = await authService.login({ identifier: "u@x.in", password: body.data.temporaryPassword, role: kind } as never);
  return { res, body, update, login };
}

describe.each(["VENDOR", "DRIVER"] as const)("%s login password reset", (kind) => {
  beforeEach(() => {
    (kind === "VENDOR" ? m.vendor : m.driver).findFirst.mockResolvedValue(account(kind, "u@x.in"));
  });

  it("replaces the hash with a random temporary password, forces a change, revokes sessions and audits", async () => {
    const { res, body, update, login } = await resetAndLogin(kind);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(body.data.login).toBe("u@x.in");
    expect(body.data.temporaryPassword).toMatch(/^.{12}$/);
    expect(update).toEqual({ where: { id: "user-1" }, data: { password: expect.stringMatching(/^\$2[aby]\$12\$/), mustChangePassword: true } });
    expect(update.data.password).not.toContain(body.data.temporaryPassword);
    expect(m.refreshToken.updateMany).toHaveBeenCalledWith({ where: { userId: "user-1", revokedAt: null }, data: { revokedAt: expect.any(Date) } });
    expect(m.passwordResetToken.updateMany).toHaveBeenCalledWith({ where: { userId: "user-1", usedAt: null }, data: { usedAt: expect.any(Date) } });
    const audit = JSON.stringify(m.auditLog.create.mock.calls[0][0]);
    expect(audit).toContain("LOGIN_PASSWORD_RESET");
    expect(audit).not.toContain(body.data.temporaryPassword);
    expect(audit).not.toContain(update.data.password);
    expect(login).toEqual({ passwordChangeRequired: true, changeToken: "change-token", user: expect.objectContaining({ role: kind }) });
  });

  it("generates a different password each time", async () => {
    const first = (await resetAndLogin(kind)).body.data.temporaryPassword;
    m.user.update.mockClear();
    const second = (await resetAndLogin(kind)).body.data.temporaryPassword;
    expect(first).not.toBe(second);
  });

  it("is Super Admin only", async () => {
    m.requestUser.mockResolvedValue({ id: "ops-1", role: "OPERATIONS", isActive: true, deletedAt: null });
    const path = `/api/admin/${kind === "VENDOR" ? "vendors" : "drivers"}/acc-1/reset-password`;
    const res = kind === "VENDOR" ? await resetVendor(req(path), ctx("acc-1")) : await resetDriver(req(path), ctx("acc-1"));
    expect(res.status).toBe(403);
    expect(m.user.update).not.toHaveBeenCalled();
  });

  it("never resets a login of another role", async () => {
    (kind === "VENDOR" ? m.vendor : m.driver).findFirst.mockResolvedValue(account("CUSTOMER", "u@x.in"));
    const path = `/api/admin/${kind === "VENDOR" ? "vendors" : "drivers"}/acc-1/reset-password`;
    const res = kind === "VENDOR" ? await resetVendor(req(path), ctx("acc-1")) : await resetDriver(req(path), ctx("acc-1"));
    expect(res.status).toBe(409);
    expect(m.user.update).not.toHaveBeenCalled();
  });
});
