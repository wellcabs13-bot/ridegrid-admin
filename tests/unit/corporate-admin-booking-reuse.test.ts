// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  employee: null as any,
  readEmployee: vi.fn(async () => ({ ok: true })),
  writeEmployee: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { corporateEmployee: { findFirst: vi.fn(async () => mocks.employee) } },
}));

vi.mock("@/lib/corporate-employee-mobile/read", () => ({ readEmployee: mocks.readEmployee }));
vi.mock("@/lib/corporate-employee-mobile/write", () => ({ writeEmployee: mocks.writeEmployee }));

import { adminBookingRead, adminBookingWrite, isAdminBookingReadSection, isAdminBookingWriteSection } from "@/lib/corporate-admin/booking";
import { CorporateAdminError } from "@/lib/corporate-admin/access";

const adminAccess = {
  user: { id: "user-1", name: "Priya Admin" },
  corporateId: "corp-1",
  adminEmployeeId: "employee-1",
  company: { id: "corp-1", companyName: "Acme", status: "ACTIVE" },
};

beforeEach(() => {
  mocks.employee = { id: "employee-1", corporateId: "corp-1", userId: "user-1", isActive: true, employeeName: "Priya Admin" };
  mocks.readEmployee.mockClear();
  mocks.writeEmployee.mockClear();
});

describe("corporate admin booking section routing", () => {
  it("recognises the booking read/write sections and nothing else", () => {
    expect(isAdminBookingReadSection("booking-search")).toBe(true);
    expect(isAdminBookingReadSection("booking-config")).toBe(true);
    expect(isAdminBookingReadSection("bookings")).toBe(false);
    expect(isAdminBookingWriteSection("booking-quote")).toBe(true);
    expect(isAdminBookingWriteSection("booking-book")).toBe(true);
    expect(isAdminBookingWriteSection("booking-approval")).toBe(true);
    expect(isAdminBookingWriteSection("approvals")).toBe(false);
  });

  it("adminBookingRead delegates to the employee app's readEmployee with the admin's own employee profile, never a shadow implementation", async () => {
    const request = new NextRequest("https://ridegrid.test/api/corporate-admin/booking-search?serviceType=LOCAL");
    await adminBookingRead(request, "booking-search", adminAccess);

    expect(mocks.readEmployee).toHaveBeenCalledTimes(1);
    const [, section, access] = mocks.readEmployee.mock.calls[0];
    expect(section).toBe("search");
    expect(access.employee.id).toBe("employee-1");
    expect(access.employee.corporateId).toBe("corp-1");
    expect(access.user.id).toBe("user-1");
  });

  it("adminBookingWrite delegates 'booking-book' to writeEmployee's 'book' - same commit path as the employee app", async () => {
    await adminBookingWrite("booking-book", { quoteId: "q1" }, adminAccess);

    expect(mocks.writeEmployee).toHaveBeenCalledTimes(1);
    const [section, body, access] = mocks.writeEmployee.mock.calls[0];
    expect(section).toBe("book");
    expect(body).toEqual({ quoteId: "q1" });
    expect(access.employee.id).toBe("employee-1");
  });

  it("adminBookingWrite maps 'booking-approval' to writeEmployee's 'approvals' section", async () => {
    await adminBookingWrite("booking-approval", { note: "urgent" }, adminAccess);
    expect(mocks.writeEmployee.mock.calls[0][0]).toBe("approvals");
  });

  it("refuses when the Corporate Admin has no active traveller profile of their own", async () => {
    mocks.employee = { id: "employee-1", corporateId: "corp-1", userId: "user-1", isActive: false };
    await expect(adminBookingWrite("booking-book", {}, adminAccess)).rejects.toBeInstanceOf(CorporateAdminError);
    expect(mocks.writeEmployee).not.toHaveBeenCalled();
  });
});
