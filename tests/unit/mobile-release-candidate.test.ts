// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Regressions found in the 4-app release-candidate pass: booking APIs reachable from
// app tokens, legacy vendor responses, notification deep links, vendor standing,
// marketplace eligibility and login status disclosure.

const m = vi.hoisted(() => ({
  booking: { findMany: vi.fn(), findFirst: vi.fn() },
  customer: { findFirst: vi.fn() },
  user: { findUnique: vi.fn(), findMany: vi.fn() },
  vendor: { findFirst: vi.fn() },
  vehicle: { findMany: vi.fn() },
  pricingRateVersion: { findMany: vi.fn() },
  requestUser: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { booking: m.booking, customer: m.customer, user: m.user, vendor: m.vendor, vehicle: m.vehicle, pricingRateVersion: m.pricingRateVersion },
}));
vi.mock("@/lib/auth/password", () => ({ passwordService: { verify: m.verify } }));
vi.mock("@/lib/request-access", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/request-access");
  const { hasPermission } = await vi.importActual<typeof import("@/lib/permissions")>("@/lib/permissions");
  const { NextResponse } = await import("next/server");
  const requestPermission = async (_req: unknown, permission: Parameters<typeof hasPermission>[1]) => {
    const user = await m.requestUser();
    if (!user) return { user: null, denied: NextResponse.json({ success: false }, { status: 401 }) };
    if (!hasPermission(user.role, permission)) return { user: null, denied: NextResponse.json({ success: false }, { status: 403 }) };
    return { user, denied: null };
  };
  return { ...actual, requestUser: m.requestUser, requestPermission };
});

import { bookingScope } from "@/lib/request-access";
import { bookingViewSelect } from "@/lib/services/booking/BookingContactPolicy";
import { GET as bookingsList } from "@/app/api/bookings/route";
import { GET as customerBookings } from "@/app/api/customers/bookings/route";
import { GET as mobileBookings } from "@/app/api/mobile/bookings/route";
import { vendorSafe, vendorSafeBooking } from "@/lib/vendor-mobile/redact";
import { withNotificationTargets } from "@/lib/notifications/NotificationTargets";
import { vendorStanding } from "@/lib/vendor-mobile/read";
import { marketplaceRateWhere } from "@/lib/services/marketplace/MarketplaceOptionsService";
import { authService } from "@/lib/auth/auth";

const PRIVATE = ["owner@vendor.test", "9876500001", "ACC-998877", "HDFC0000999", "AADHAAR-4455", "vendorPayout", "rideGridRevenue", "processingCost"];
const viewRow = (status: string) => ({
  id: "b1", bookingNumber: "WC2001", bookingSource: "APP", status, tripType: "ONEWAY", tripDays: 1,
  pickupLocation: "A", dropLocation: "B", pickupDateTime: new Date("2030-01-01"), createdAt: new Date("2029-12-01"), holdExpiresAt: null,
  estimatedFare: 1000, baseFare: 900, taxAmount: 50, discountAmount: 0, couponAmount: 0, extraCharges: 0, finalFare: 1000,
  vendorEarning: 800, cancelReason: null, cancelledAt: null, refundAmount: null,
  customer: { id: "c1", firstName: "Asha", lastName: "K", user: { id: "cu", name: "Asha K", email: "asha@customer.test", mobile: "9000000001" } },
  vendor: { id: "v1", companyName: "Sahyadri Cabs", userId: "vendor-user", user: { name: "Owner", email: "owner@vendor.test", mobile: "9876500001" } },
  vehicle: { id: "car", make: "Toyota", model: "Innova", variant: null, category: "SUV", fuelType: "DIESEL", transmission: "MANUAL", seatingCapacity: 7, luggageCapacity: 3, year: 2024, color: "White", registrationNumber: "MH12AB1234" },
  driver: { id: "d1", firstName: "Ravi", lastName: "Kumar", user: { mobile: "9876500002" } },
  trip: null, transactions: [], statusHistory: [],
});

beforeEach(() => vi.clearAllMocks());

describe("booking APIs reachable with app tokens", () => {
  it("scopes a corporate employee to their own rides, never colleagues' bookings", () => {
    expect(bookingScope({ id: "emp-user", role: "CORPORATE_EMPLOYEE" })).toEqual({
      customer: { userId: "emp-user" }, corporate: { employees: { some: { userId: "emp-user", isActive: true } } },
    });
    expect(bookingScope({ id: "admin-user", role: "CORPORATE_ADMIN" })).toEqual({ corporate: { employees: { some: { userId: "admin-user", isActive: true } } } });
  });

  it("GET /api/bookings returns only role-aware booking fields", async () => {
    m.requestUser.mockResolvedValue({ id: "cu", role: "CUSTOMER" });
    m.booking.findMany.mockResolvedValue([viewRow("CONFIRMED")]);
    const res = await bookingsList(new NextRequest("https://ridegrid.test/api/bookings"));
    expect(res.status).toBe(200);
    const args = m.booking.findMany.mock.calls[0][0];
    expect(args.select).toBe(bookingViewSelect);
    expect(args.include).toBeUndefined();
    expect(args.where).toMatchObject({ customer: { userId: "cu" }, deletedAt: null });
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("owner@vendor.test");
    expect(text).not.toContain("9876500002"); // driver mobile before a live assignment
    expect(text).not.toContain("vendorEarning");
  });

  it("GET /api/customers/bookings never loads full vendor/driver records", async () => {
    m.requestUser.mockResolvedValue({ id: "cu", role: "CUSTOMER" });
    m.customer.findFirst.mockResolvedValue({ id: "c1" });
    m.booking.findMany.mockResolvedValue([viewRow("CONFIRMED")]);
    const res = await customerBookings(new NextRequest("https://ridegrid.test/api/customers/bookings"));
    expect(res.status).toBe(200);
    const args = m.booking.findMany.mock.calls[0][0];
    expect(args.select).toBe(bookingViewSelect);
    expect(args.include).toBeUndefined();
    expect(args.where).toEqual({ customerId: "c1", deletedAt: null });
    const text = JSON.stringify(await res.json());
    for (const secret of PRIVATE) expect(text).not.toContain(secret);
  });

  it("GET /api/customers/bookings requires an active signed-in user", async () => {
    m.requestUser.mockResolvedValue(null);
    expect((await customerBookings(new NextRequest("https://ridegrid.test/api/customers/bookings"))).status).toBe(401);
  });

  it("mobile bookings hide the driver's mobile until the assignment is live and strip internal fare splits", async () => {
    m.requestUser.mockResolvedValue({ id: "cu", role: "CUSTOMER" });
    const row = (status: string) => ({
      id: "b1", bookingNumber: "WC2001", status, tripType: "ONEWAY", tripDays: 1, pickupLocation: "A", dropLocation: "B", pickupDateTime: new Date(), reservedUntil: null,
      finalFare: 1000, estimatedFare: 1000, priceSnapshot: { vendorFare: "900", finalPayable: "1000", vendorPayout: "880", processingCost: "20", rideGridRevenue: "100" },
      pricingPackage: null, vehicle: { make: "Toyota", model: "Innova", category: "SUV", registrationNumber: "MH12", seatingCapacity: 7 },
      vendor: { companyName: "Sahyadri Cabs" }, driver: { firstName: "Ravi", lastName: "Kumar", user: { mobile: "9876500002" } }, transactions: [], statusHistory: [],
    });
    m.booking.findMany.mockResolvedValue([row("CONFIRMED"), row("DRIVER_ASSIGNED"), row("TRIP_COMPLETED")]);
    const body = await (await mobileBookings(new NextRequest("https://ridegrid.test/api/mobile/bookings"))).json();
    const [confirmed, assigned, completed] = body.data.bookings;
    expect(confirmed.driver.user.mobile).toBeNull();
    expect(assigned.driver.user.mobile).toBe("9876500002");
    expect(completed.driver.user.mobile).toBeNull();
    for (const b of body.data.bookings) {
      expect(b.priceSnapshot).toEqual({ vendorFare: "900", finalPayable: "1000" });
    }
  });
});

describe("legacy vendor responses", () => {
  it("drop identity numbers and RideGrid splits and mask bank accounts", () => {
    const out = vendorSafe({
      vendor: { accountNumber: "ACC-998877", ifscCode: "HDFC0000999", createdAt: new Date("2030-01-01") },
      drivers: [{ aadhaarNumber: "AADHAAR-4455", licenseNumber: "DL-7788", user: { passwordHash: "x" } }],
      bookings: [{ platformCommission: 100, driverPayout: 700, vendorEarning: 800 }],
    });
    expect(out.vendor.accountNumber).toBe("••••8877");
    expect(out.vendor.createdAt).toBeInstanceOf(Date);
    expect(out.drivers[0]).toEqual({ licenseNumber: "DL-7788", user: {} });
    expect(out.bookings[0]).toEqual({ vendorEarning: 800 });
  });
  it("share passenger contact only while the booking is live", () => {
    const booking = (status: string) => ({ status, customer: { firstName: "Asha", user: { name: "Asha", email: "a@x.test", mobile: "9000000001" } } });
    expect(vendorSafeBooking(booking("CONFIRMED")).customer.user).toEqual({ name: "Asha" });
    expect(vendorSafeBooking(booking("TRIP_STARTED")).customer.user).toEqual({ name: "Asha", email: "a@x.test", mobile: "9000000001" });
  });
});

describe("notification deep links", () => {
  const notes = [
    { title: "Trip assigned to you", message: "WC2001 at 10:00. Refresh My Trips for current details." },
    { title: "Booking confirmed", message: "WC9999 is confirmed." },
    { title: "Travel approval required", message: "A ride request is awaiting your decision." },
    { title: "Ride request approved", message: "Your ride request was approved." },
  ];
  it("resolves booking numbers only against the caller's own bookings", async () => {
    m.booking.findMany.mockResolvedValue([{ id: "b1", bookingNumber: "WC2001" }]);
    const out = await withNotificationTargets(notes, { driverId: "d1" });
    expect(m.booking.findMany.mock.calls[0][0].where).toEqual({ AND: [{ driverId: "d1" }, { bookingNumber: { in: ["WC2001", "WC9999"] }, deletedAt: null }] });
    expect(out.map((n) => n.target)).toEqual([{ type: "booking", id: "b1", bookingNumber: "WC2001" }, null, null, null]);
  });
  it("maps approval notifications for corporate employees only", async () => {
    m.booking.findMany.mockResolvedValue([]);
    const out = await withNotificationTargets(notes, { customer: { userId: "u" } }, { approvals: true });
    expect(out.map((n) => n.target)).toEqual([null, null, { type: "reviews" }, { type: "approvals" }]);
  });
});

describe("vendor standing", () => {
  it("is never live while pending, suspended or without an approved price", async () => {
    m.vendor.findFirst.mockResolvedValue({ isApproved: false, verifiedAt: null, suspendedAt: null, suspensionReason: null });
    m.pricingRateVersion.findMany.mockResolvedValue([]);
    m.vehicle.findMany.mockResolvedValue([{ isVerified: false, status: "AVAILABLE", driverId: null }]);
    const pending = await vendorStanding("v1");
    expect(pending).toMatchObject({ state: "PENDING", liveVehicles: 0 });
    expect(pending.reasons.join(" ")).toMatch(/not verified your business/);
    expect(m.pricingRateVersion.findMany.mock.calls[0][0].where.pricingPackage.vehicle.vendorId).toBe("v1");

    m.vendor.findFirst.mockResolvedValue({ isApproved: true, verifiedAt: new Date(), suspendedAt: new Date(), suspensionReason: "Documents expired" });
    expect((await vendorStanding("v1")).reasons[0]).toBe("Your account is suspended: Documents expired");

    m.vendor.findFirst.mockResolvedValue({ isApproved: true, verifiedAt: new Date(), suspendedAt: null, suspensionReason: null });
    m.pricingRateVersion.findMany.mockResolvedValue([{ pricingPackage: { vehicleId: "car" } }, { pricingPackage: { vehicleId: "car" } }]);
    m.vehicle.findMany.mockResolvedValue([{ isVerified: true, status: "AVAILABLE", driverId: "d1" }]);
    expect(await vendorStanding("v1")).toMatchObject({ state: "VERIFIED", liveVehicles: 1, totalVehicles: 1, reasons: [] });
  });
  it("uses the marketplace definition, which excludes suspended vendors", () => {
    const where = marketplaceRateWhere(new Date("2030-01-01"), "v1") as { pricingPackage: { vehicle: { vendorId: string; vendor: Record<string, unknown> } } };
    expect(where.pricingPackage.vehicle.vendorId).toBe("v1");
    expect(where.pricingPackage.vehicle.vendor).toMatchObject({ isApproved: true, suspendedAt: null });
    expect((marketplaceRateWhere(new Date()) as { pricingPackage: { vehicle: Record<string, unknown> } }).pricingPackage.vehicle.vendorId).toBeUndefined();
  });
});

describe("login status disclosure", () => {
  it("does not reveal that an account is inactive to someone without its password", async () => {
    m.user.findMany.mockResolvedValue([{ id: "u", email: "x@y.test", role: "CUSTOMER", password: "hash", isActive: false, deletedAt: null }]);
    m.verify.mockResolvedValue(false);
    await expect(authService.login({ identifier: "x@y.test", password: "wrong" })).rejects.toThrow("Invalid email/mobile number or password.");
    m.verify.mockResolvedValue(true);
    await expect(authService.login({ identifier: "x@y.test", password: "right" })).rejects.toThrow(/inactive or suspended/);
  });
});
