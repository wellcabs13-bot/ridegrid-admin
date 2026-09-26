// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({
  requestUser: vi.fn(),
  vendor: { findFirst: vi.fn(), update: vi.fn() },
  booking: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  vehicle: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  driver: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  notification: { updateMany: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
  bookingStatusHistory: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: m }));
import { GET, POST } from "@/app/api/mobile/vendor/[section]/route";
import { editableDriverScope } from "@/lib/vendor-mobile/access";
import { legacyVendorId, centralFleetAccess } from "@/lib/vendor-mobile/legacy";
const req = (section: string, body?: unknown, origin?: string) =>
  new NextRequest(`https://ridegrid.test/api/mobile/vendor/${section}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(origin ? { origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
const get = (section: string, query = "") =>
  GET(req(section + query), { params: Promise.resolve({ section }) });
const post = (section: string, body: unknown, origin?: string) =>
  POST(req(section, body, origin), { params: Promise.resolve({ section }) });
beforeEach(() => {
  vi.resetAllMocks();
  m.requestUser.mockResolvedValue({ id: "user-a", role: "VENDOR" });
  m.vendor.findFirst.mockResolvedValue({ id: "vendor-a", isApproved: true });
  m.$transaction.mockImplementation((work: (tx: typeof m) => unknown) =>
    work(m),
  );
  m.booking.findMany.mockResolvedValue([]);
  m.vehicle.findMany.mockResolvedValue([]);
  m.driver.findMany.mockResolvedValue([]);
});
describe("vendor mobile security", () => {
  it("requires a current vendor account before data access", async () => {
    m.requestUser.mockResolvedValue(null);
    expect((await get("bookings")).status).toBe(401);
    m.requestUser.mockResolvedValue({ id: "customer", role: "CUSTOMER" });
    expect((await get("fleet")).status).toBe(403);
    expect(m.vendor.findFirst).not.toHaveBeenCalled();
  });
  it("derives vendor identity and filters booking deep links", async () => {
    expect((await get("bookings", "?id=other&vendorId=vendor-b")).status).toBe(
      404,
    );
    expect(m.booking.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "other", vendorId: "vendor-a", deletedAt: null },
      }),
    );
    const select = m.booking.findFirst.mock.calls[0][0].select;
    expect(select.customer.select).toEqual({ firstName: true, lastName: true });
    expect(select.priceSnapshot).toBeUndefined();
    expect(select.transactions.select).toEqual({
      paymentStatus: true,
      paymentMethod: true,
    });
  });
  it("scopes vehicles and drivers including nested assignments", async () => {
    await get("fleet", "?vendorId=vendor-b");
    expect(m.vehicle.findMany.mock.calls[0][0].where.vendorId).toBe("vendor-a");
    await get("drivers", "?vendorId=vendor-b");
    const q = m.driver.findMany.mock.calls[0][0];
    expect(q.where.vehicles.some.vendorId).toBe("vendor-a");
    expect(q.select.vehicles.where.vendorId).toBe("vendor-a");
    expect(q.select.bookings.where.vendorId).toBe("vendor-a");
    expect(q.select.user.select.password).toBeUndefined();
  });
  it("cannot edit another vendor's vehicle", async () => {
    m.vehicle.findFirst.mockResolvedValue(null);
    expect(
      (
        await post("fleet", {
          id: "other",
          action: "status",
          status: "AVAILABLE",
          vendorId: "vendor-b",
        })
      ).status,
    ).toBe(404);
    expect(m.vehicle.update).not.toHaveBeenCalled();
  });
  it("rejects cross-site changes and marks only owned notices", async () => {
    expect(
      (await post("notifications", { id: "notice" }, "https://evil.test"))
        .status,
    ).toBe(403);
    await post("notifications", { id: "notice", userId: "other" });
    expect(m.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "notice", userId: "user-a", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
  it("rejects driver edits when association is not exclusively manageable", async () => {
    m.driver.findFirst.mockResolvedValue(null);
    expect(
      (
        await post("drivers", {
          id: "shared",
          action: "status",
          status: "ACTIVE",
        })
      ).status,
    ).toBe(403);
    expect(m.driver.findFirst.mock.calls[0][0].where).toEqual({
      id: "shared",
      ...editableDriverScope("vendor-a"),
    });
    expect(m.driver.update).not.toHaveBeenCalled();
  });
  it("does not expose internal errors", async () => {
    m.booking.findMany.mockRejectedValue(
      new Error("Prisma password=secret SQL stack"),
    );
    const r = await get("bookings");
    expect(r.status).toBe(500);
    expect(JSON.stringify(await r.json())).not.toMatch(
      /Prisma|password|SQL|stack/,
    );
  });
  it("bounds pagination and rejects invalid availability dates", async () => {
    expect((await get("fleet", "?page=NaN")).status).toBe(400);
    expect((await get("availability", "?date=2026-02-31")).status).toBe(400);
    expect(m.vehicle.findMany).not.toHaveBeenCalled();
  });
  it("binds legacy vendor endpoints and denies administrative CRUD", async () => {
    expect(await legacyVendorId(req("fleet?vendorId=vendor-b"))).toBe(
      "vendor-a",
    );
    expect(
      (await centralFleetAccess(req("fleet", { id: "other" }), "fleet"))
        ?.status,
    ).toBe(403);
  });
});
describe("assignment confirmation", () => {
  beforeEach(() => {
    m.vehicle.findFirst.mockResolvedValue({
      id: "car-a",
      vendorId: "vendor-a",
      driverId: "driver-a",
      status: "AVAILABLE",
      isVerified: true,
    });
    m.driver.findFirst.mockResolvedValue({
      id: "driver-a",
      status: "ACTIVE",
      user: { isActive: true, deletedAt: null },
    });
  });
  const input = {
    vehicleId: "car-a",
    driverId: "driver-a",
    bookingId: "booking-a",
  };
  const booking = {
    id: "booking-a",
    driverId: null,
    status: "CONFIRMED",
    vehicleId: "car-a",
    pickupDateTime: new Date("2026-10-01T06:30:00Z"),
    reservedFrom: new Date("2026-09-30T18:30:00Z"),
    reservedUntil: new Date("2026-10-01T18:30:00Z"),
    tripDays: 1,
    priceSnapshot: null,
  };
  it("requires an owned booking and exact vehicle relationship", async () => {
    expect((await post("assignment", input)).status).toBe(404);
    expect(m.booking.findFirst.mock.calls[0][0].where).toEqual({
      id: "booking-a",
      vendorId: "vendor-a",
      vehicleId: "car-a",
      deletedAt: null,
    });
    expect(m.booking.update).not.toHaveBeenCalled();
  });
  it("rejects conflicting reservations", async () => {
    m.booking.findFirst.mockResolvedValue(booking);
    m.booking.findMany.mockResolvedValue([
      { ...booking, id: "other-booking", driverId: "driver-a" },
    ]);
    expect((await post("assignment", input)).status).toBe(409);
    expect(m.booking.update).not.toHaveBeenCalled();
  });
  it("confirms and records history in a serializable transaction", async () => {
    m.booking.findFirst.mockResolvedValue(booking);
    expect((await post("assignment", input)).status).toBe(200);
    expect(m.booking.update).toHaveBeenCalledWith({
      where: { id: "booking-a" },
      data: { driverId: "driver-a", status: "DRIVER_ASSIGNED" },
    });
    expect(m.bookingStatusHistory.create).toHaveBeenCalled();
    expect(m.auditLog.create).toHaveBeenCalled();
    expect(m.$transaction.mock.calls[0][1]).toEqual({
      isolationLevel: "Serializable",
    });
  });
  it("does not reassign an already booked driver or change an active trip", async () => {
    m.booking.findFirst.mockResolvedValue({ ...booking, driverId: "another" });
    expect((await post("assignment", input)).status).toBe(409);
    m.booking.findFirst.mockResolvedValue({
      ...booking,
      status: "TRIP_STARTED",
    });
    expect((await post("assignment", input)).status).toBe(409);
    expect(m.booking.update).not.toHaveBeenCalled();
  });
});

