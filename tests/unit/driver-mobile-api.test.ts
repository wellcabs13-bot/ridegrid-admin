// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const m = vi.hoisted(() => ({ requestUser: vi.fn(), driver: { findFirst: vi.fn() }, booking: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() }, vehicle: { findMany: vi.fn() }, trip: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }, tripLocation: { findFirst: vi.fn(), create: vi.fn() }, notification: { createMany: vi.fn(), updateMany: vi.fn() }, bookingStatusHistory: { create: vi.fn() }, auditLog: { create: vi.fn(), findFirst: vi.fn() }, $transaction: vi.fn() }));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: m }));
import { GET, POST } from "@/app/api/mobile/driver/[section]/route";
import { POST as legacyGps } from "@/app/api/driver/location/route";
import { nextDriverState } from "@/lib/services/booking/DriverTripService";
import { GET as tracking } from "@/app/api/mobile/trip-status/route";
const req = (path: string, body?: unknown) => new NextRequest(`https://ridegrid.test/api/mobile/driver/${path}`, { method: body === undefined ? "GET" : "POST", ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }) });
const get = (section: string, query = "") => GET(req(section + query), { params: Promise.resolve({ section }) });
const post = (section: string, body: unknown) => POST(req(section, body), { params: Promise.resolve({ section }) });
const assignment = (status = "DRIVER_ASSIGNED", tripStatus: string | null = null) => ({ id: "booking-a", bookingNumber: "RG-1", driverId: "driver-a", vehicleId: "car-a", vendorId: "vendor-a", status, updatedAt: new Date(0), vehicle: { id: "car-a", deletedAt: null, vendorId: "vendor-a" }, customer: { userId: "customer" }, vendor: { userId: "vendor" }, trip: tripStatus ? { id: "trip-a", driverId: "driver-a", vehicleId: "car-a", deletedAt: null, status: tripStatus } : null });
beforeEach(() => {
  vi.resetAllMocks(); m.requestUser.mockResolvedValue({ id: "user-a", role: "DRIVER" }); m.driver.findFirst.mockResolvedValue({ id: "driver-a", status: "ACTIVE" });
  m.$transaction.mockImplementation((fn: (tx: typeof m) => unknown) => fn(m)); m.booking.findMany.mockResolvedValue([]); m.vehicle.findMany.mockResolvedValue([]); m.booking.updateMany.mockResolvedValue({ count: 1 }); m.trip.create.mockResolvedValue({ id: "trip-a" }); m.trip.update.mockResolvedValue({ id: "trip-a" });
});
describe("driver ownership and privacy", () => {
  it("rejects anonymous, wrong role and inactive drivers", async () => {
    m.requestUser.mockResolvedValue(null); expect((await get("profile")).status).toBe(401);
    m.requestUser.mockResolvedValue({ id: "user", role: "CUSTOMER" }); expect((await get("trips")).status).toBe(403);
    expect(m.driver.findFirst).not.toHaveBeenCalled();
    m.requestUser.mockResolvedValue({ id: "user-a", role: "DRIVER" }); m.driver.findFirst.mockResolvedValue({ id: "driver-a", status: "SUSPENDED" }); expect((await get("trips")).status).toBe(403);
  });
  it("rejects other driver profile IDs and scopes every trip read", async () => {
    expect((await get("profile", "?driverId=driver-b")).status).toBe(403);
    expect((await get("trips", "?id=booking-b")).status).toBe(404);
    expect(m.booking.findFirst.mock.calls[0][0].where).toEqual({ id: "booking-b", driverId: "driver-a", deletedAt: null });
    await get("trips"); const s = m.booking.findMany.mock.calls[0][0].select;
    expect(s.customer.select).toEqual({ firstName: true, lastName: true }); expect(s.transactions).toBeUndefined(); expect(s.priceSnapshot).toBeUndefined(); expect(s.vehicle.select.baseFare).toBeUndefined();
  });
  it("does not expose terminal customer contact", async () => { m.booking.findFirst.mockResolvedValue(assignment("TRIP_COMPLETED", "COMPLETED")); const response = await get("trips", "?id=booking-a"); expect((await response.json()).data.customerPhone).toBeNull(); expect(m.booking.findFirst).toHaveBeenCalledTimes(1); });
  it("limits vehicles to current fleet or booking assignments", async () => { await get("vehicle", "?id=car-b"); expect(m.vehicle.findMany.mock.calls[0][0].where).toMatchObject({ id: "car-b", OR: [{ driverId: "driver-a" }, { bookings: { some: { driverId: "driver-a", deletedAt: null, status: { in: ["DRIVER_ASSIGNED", "TRIP_STARTED"] } } } }] }); });
  it("scopes notification changes and rejects forged body identity", async () => { await post("notifications", { id: "notice-b", userId: "user-b" }); expect(m.notification.updateMany.mock.calls[0][0].where.userId).toBe("user-a"); expect((await post("trips", { driverId: "driver-b", bookingId: "booking-b", action: "START" })).status).toBe(403); });
  it("rejects cross-site mutation", async () => { const r = req("trips", { bookingId: "a", action: "START" }); r.headers.set("origin", "https://evil.test"); expect((await POST(r, { params: Promise.resolve({ section: "trips" }) })).status).toBe(403); expect(m.$transaction).not.toHaveBeenCalled(); });
});
describe("central trip operations", () => {
  it("denies a different driver's booking before any write", async () => { m.booking.findFirst.mockResolvedValue(null); expect((await post("trips", { bookingId: "booking-b", action: "START" })).status).toBe(404); expect(m.booking.updateMany).not.toHaveBeenCalled(); expect(m.booking.findFirst.mock.calls[0][0].where.driverId).toBe("driver-a"); });
  it.each(["CANCELLED", "TRIP_COMPLETED", "PENDING"])("cannot complete %s", async status => { m.booking.findFirst.mockResolvedValue(assignment(status, "STARTED")); expect((await post("trips", { bookingId: "booking-a", action: "COMPLETE" })).status).toBe(409); expect(m.booking.updateMany).not.toHaveBeenCalled(); });
  it("requires arrival before start and start before completion", () => { expect(() => nextDriverState("DRIVER_ASSIGNED", "ASSIGNED", "START")).toThrow(); expect(() => nextDriverState("DRIVER_ASSIGNED", "ARRIVED_AT_PICKUP", "COMPLETE")).toThrow(); });
  it.each([["ARRIVED", "DRIVER_ASSIGNED", null, "DRIVER_ASSIGNED", "ARRIVED_AT_PICKUP"], ["START", "DRIVER_ASSIGNED", "ARRIVED_AT_PICKUP", "TRIP_STARTED", "STARTED"], ["COMPLETE", "TRIP_STARTED", "STARTED", "TRIP_COMPLETED", "COMPLETED"]])("%s updates the shared state, history, audit and notifications", async (action, previous, trip, expected, tripExpected) => {
    m.booking.findFirst.mockResolvedValue(assignment(previous!, trip)); const r = await post("trips", { bookingId: "booking-a", action }); expect(r.status).toBe(200); expect((await r.json()).data.status).toBe(expected);
    expect(m.bookingStatusHistory.create.mock.calls[0][0].data).toMatchObject({ previousStatus: previous, currentStatus: expected, changedBy: "user-a" });
    expect(m.auditLog.create.mock.calls[0][0].data.newValue.status).toBe(tripExpected); expect(m.notification.createMany.mock.calls[0][0].data.map((n: { userId: string }) => n.userId)).toEqual(["user-a", "customer", "vendor"]); expect(m.$transaction.mock.calls[0][1].isolationLevel).toBe("Serializable");
  });
  it("rejects stale assignment and concurrent status changes", async () => { const b = assignment("DRIVER_ASSIGNED", "ASSIGNED"); b.trip!.driverId = "driver-b"; m.booking.findFirst.mockResolvedValue(b); expect((await post("trips", { bookingId: b.id, action: "ARRIVED" })).status).toBe(409); m.booking.findFirst.mockResolvedValue(assignment()); m.booking.updateMany.mockResolvedValue({ count: 0 }); expect((await post("trips", { bookingId: b.id, action: "ARRIVED" })).status).toBe(409); expect(m.trip.create).not.toHaveBeenCalled(); });
});
describe("authenticated GPS", () => {
  const point = { tripId: "trip-a", latitude: 18.5, longitude: 73.8, accuracy: 12 };
  it("secures the original unauthenticated route", async () => { m.requestUser.mockResolvedValue(null); expect((await legacyGps(req("location", point))).status).toBe(401); expect(m.tripLocation.create).not.toHaveBeenCalled(); });
  it("rejects cross-driver trips and spoofed identities", async () => { expect((await post("location", point)).status).toBe(404); expect(m.trip.findFirst.mock.calls[0][0].where.driverId).toBe("driver-a"); expect((await post("location", { ...point, driverId: "driver-b" })).status).toBe(403); });
  it.each([NaN, 91, "18.5", null])("rejects invalid latitude %s", async latitude => { expect((await post("location", { ...point, latitude })).status).toBe(400); expect(m.tripLocation.create).not.toHaveBeenCalled(); });
  it("does not accept completed or mismatched booking GPS", async () => { m.trip.findFirst.mockResolvedValue({ bookingId: "booking-a" }); m.booking.findFirst.mockResolvedValue(assignment("TRIP_COMPLETED", "COMPLETED")); expect((await post("location", point)).status).toBe(409); m.booking.findFirst.mockResolvedValue(assignment("TRIP_STARTED", "STARTED")); expect((await post("location", { ...point, bookingId: "booking-b" })).status).toBe(403); });
  it("derives identity, source and timestamp and commits attestation", async () => { m.trip.findFirst.mockResolvedValue({ bookingId: "booking-a" }); m.booking.findFirst.mockResolvedValue(assignment("TRIP_STARTED", "STARTED")); m.tripLocation.create.mockResolvedValue({ id: "loc", recordedAt: new Date() }); expect((await post("location", { ...point, source: "MANUAL", recordedAt: "2000-01-01" })).status).toBe(200); expect(m.tripLocation.create.mock.calls[0][0].data).toMatchObject({ driverId: "driver-a", vehicleId: "car-a", source: "MOBILE", recordedAt: expect.any(Date) }); expect(m.auditLog.create.mock.calls[0][0].data.entityName).toBe("TrustedDriverLocation"); });
  it("rate limits uploads", async () => { m.trip.findFirst.mockResolvedValue({ bookingId: "booking-a" }); m.booking.findFirst.mockResolvedValue(assignment("TRIP_STARTED", "STARTED")); m.tripLocation.findFirst.mockResolvedValue({ recordedAt: new Date() }); expect((await post("location", point)).status).toBe(429); });
});
describe("customer tracking trust", () => {
  it("returns only fresh attested customer-safe coordinates", async () => {
    m.requestUser.mockResolvedValue({ id: "customer", role: "CUSTOMER" });
    m.booking.findFirst.mockResolvedValue(assignment("TRIP_STARTED", "STARTED"));
    m.tripLocation.findFirst.mockResolvedValue({ id: "trusted", driverId: "driver-a", vehicleId: "car-a", latitude: 18.5, longitude: 73.8, accuracy: 12, recordedAt: new Date(), trip: { driverId: "driver-a", vehicleId: "car-a", booking: { driverId: "driver-a", vehicleId: "car-a" } } });
    m.auditLog.findFirst.mockResolvedValue({ id: "attestation" });
    const response = await tracking(new NextRequest("https://ridegrid.test/api/mobile/trip-status?id=booking-a")); const data = (await response.json()).data;
    expect(data.liveTracking).toBe(true); expect(Object.keys(data.location).sort()).toEqual(["accuracy", "latitude", "longitude", "recordedAt"]);
    expect(m.tripLocation.findFirst.mock.calls[0][0].where.recordedAt.gte).toBeInstanceOf(Date);
    expect(m.booking.findFirst.mock.calls[0][0].where.customer.userId).toBe("customer");
  });
  it("never exposes historical unattested locations", async () => { m.requestUser.mockResolvedValue({ id: "customer", role: "CUSTOMER" }); m.booking.findFirst.mockResolvedValue(assignment("TRIP_STARTED", "STARTED")); m.tripLocation.findFirst.mockResolvedValue({ id: "old", driverId: "driver-a", vehicleId: "car-a", trip: { driverId: "driver-a", vehicleId: "car-a", booking: { driverId: "driver-a", vehicleId: "car-a" } } }); const response = await tracking(new NextRequest("https://ridegrid.test/api/mobile/trip-status?id=booking-a")); expect((await response.json()).data.liveTracking).toBe(false); });
});
