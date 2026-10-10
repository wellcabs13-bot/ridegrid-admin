import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DriverError, required, type DriverAccess } from "@/lib/driver-mobile/access";
import { emitRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";
import { sendPush } from "@/lib/notifications/push";

export async function ownedAssignment(tx: Prisma.TransactionClient, a: DriverAccess, bookingId: string) {
  const b = await tx.booking.findFirst({
    where: { id: bookingId, driverId: a.driverId, deletedAt: null, driver: { status: "ACTIVE", deletedAt: null, user: { isActive: true, deletedAt: null } } },
    include: { trip: true, vehicle: { select: { id: true, deletedAt: true, vendorId: true } }, customer: { select: { userId: true } }, vendor: { select: { userId: true } } },
  });
  if (!b) throw new DriverError(404, "Assigned trip not found.");
  if (b.vehicle.deletedAt || b.vehicle.vendorId !== b.vendorId || (b.trip && (b.trip.deletedAt || b.trip.driverId !== a.driverId || b.trip.vehicleId !== b.vehicleId)))
    throw new DriverError(409, "Assignment is inconsistent. Contact Operations.");
  return b;
}
export function nextDriverState(booking: string, trip: string | null, action: string) {
  if (action === "ARRIVED" && booking === "DRIVER_ASSIGNED" && (!trip || trip === "ASSIGNED")) return { booking: "DRIVER_ASSIGNED", trip: "ARRIVED_AT_PICKUP" } as const;
  if (action === "START" && booking === "DRIVER_ASSIGNED" && trip === "ARRIVED_AT_PICKUP") return { booking: "TRIP_STARTED", trip: "STARTED" } as const;
  if (action === "COMPLETE" && booking === "TRIP_STARTED" && (trip === "STARTED" || trip === "PASSENGER_ONBOARD")) return { booking: "TRIP_COMPLETED", trip: "COMPLETED" } as const;
  throw new DriverError(409, "This action is not available in the current trip state. Refresh and retry.");
}
export async function transitionDriverTrip(a: DriverAccess, bookingId: string, action: string) {
  const result = await prisma.$transaction(async tx => {
    const b = await ownedAssignment(tx, a, bookingId);
    const next = nextDriverState(b.status, b.trip?.status ?? null, action), now = new Date();
    const updated = await tx.booking.updateMany({ where: { id: b.id, driverId: a.driverId, status: b.status, updatedAt: b.updatedAt, deletedAt: null }, data: { status: next.booking, updatedAt: now } });
    if (updated.count !== 1) throw new DriverError(409, "Assignment changed. Refresh and retry.");
    const times = action === "ARRIVED" ? { arrivedPickupAt: now } : action === "START" ? { tripStartedAt: now, startTime: now } : { tripCompletedAt: now, endTime: now };
    // The Trip row is first written on arrival; its assignment time is when the vendor or
    // Operations actually assigned the driver (booking history), not the arrival time.
    const assigned = b.trip ? null : await tx.bookingStatusHistory.findFirst({ where: { bookingId: b.id, currentStatus: "DRIVER_ASSIGNED" }, orderBy: { changedAt: "desc" }, select: { changedAt: true } });
    const trip = b.trip
      ? await tx.trip.update({ where: { id: b.trip.id }, data: { status: next.trip, ...times } })
      : await tx.trip.create({ data: { bookingId: b.id, driverId: a.driverId, vehicleId: b.vehicleId, status: next.trip, driverAssignedAt: assigned?.changedAt ?? now, ...times } });
    await tx.bookingStatusHistory.create({ data: { bookingId: b.id, previousStatus: b.status, currentStatus: next.booking, action: action === "COMPLETE" ? "COMPLETED" : "STATUS_CHANGED", changedBy: a.user.id, remarks: `Driver trip: ${next.trip}` } });
    await tx.auditLog.create({ data: { userId: a.user.id, action: "UPDATE", entityName: "Trip", entityId: trip.id, newValue: { status: next.trip, bookingId: b.id } } });
    // Existing notification records are written atomically with central trip state.
    // Plain-language updates; the booking number leads so the apps can link to the trip.
    const update = next.trip === "ARRIVED_AT_PICKUP" ? { title: "Driver arrived at pickup", text: "the driver has arrived at the pickup point." }
      : next.trip === "STARTED" ? { title: "Trip started", text: "the trip has started." }
      : { title: "Trip completed", text: "the trip is complete." };
    await tx.notification.createMany({ data: [...new Set([a.user.id, b.customer.userId, b.vendor.userId])].map(userId => ({ userId, notificationType: "PUSH" as const, title: update.title, message: `${b.bookingNumber}: ${update.text}`, status: "PENDING" as const })) });
    return { id: b.id, status: next.booking, trip: { id: trip.id, status: next.trip }, event: { bookingNumber: b.bookingNumber, customerId: b.customerId, customerUserId: b.customer.userId, vendorId: b.vendorId, vendorUserId: b.vendor.userId, title: update.title, message: `${b.bookingNumber}: ${update.text}` } };
  }, { isolationLevel: "Serializable" });
  const { event, ...response } = result;
  // After commit: mirror the stored notification as device push to the traveller and
  // vendor (the driver pressed the button). Best-effort; never fails the transition.
  void sendPush([...new Set([event.customerUserId, event.vendorUserId])].filter((u) => u !== a.user.id).map((userId) => ({
    userId, title: event.title, message: event.message, target: { type: "booking" as const, id: response.id, bookingNumber: event.bookingNumber },
  })));
  // Completion is a central lifecycle event (booking timeline, automation dashboard).
  if (response.status === "TRIP_COMPLETED")
    await emitRideGridEvent({
      type: AutomationTrigger.TRIP_COMPLETED, module: "BOOKING", bookingId: response.id, userId: event.customerUserId,
      customerId: event.customerId, vendorId: event.vendorId, driverId: a.driverId,
      metadata: { bookingNumber: event.bookingNumber, tripId: response.trip.id, actorId: a.user.id },
    });
  return response;
}
export function coordinates(body: Record<string, unknown>) {
  const number = (key: string, min: number, max: number, optional = false) => {
    const v = body[key];
    if (optional && (v === undefined || v === null)) return null;
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) throw new DriverError(400, `Invalid ${key}.`);
    return v;
  };
  return { latitude: number("latitude", -90, 90)!, longitude: number("longitude", -180, 180)!, accuracy: number("accuracy", 0, 10000, true), speed: number("speed", 0, 150, true), heading: number("heading", 0, 360, true) };
}
export async function recordDriverLocation(a: DriverAccess, body: Record<string, unknown>) {
  const coords = coordinates(body), tripId = required(body.tripId, "trip");
  return prisma.$transaction(async tx => {
    const trip = await tx.trip.findFirst({ where: { id: tripId, driverId: a.driverId, deletedAt: null }, select: { bookingId: true } });
    if (!trip) throw new DriverError(404, "Assigned trip not found.");
    const b = await ownedAssignment(tx, a, trip.bookingId);
    if (!b.trip || b.trip.id !== tripId || !((b.status === "DRIVER_ASSIGNED" && b.trip.status === "ARRIVED_AT_PICKUP") || (b.status === "TRIP_STARTED" && ["STARTED", "PASSENGER_ONBOARD"].includes(b.trip.status))))
      throw new DriverError(409, "Location reporting is not enabled for this trip.");
    if ((body.driverId !== undefined && body.driverId !== a.driverId) || (body.vehicleId !== undefined && body.vehicleId !== b.vehicleId) || (body.bookingId !== undefined && body.bookingId !== b.id)) throw new DriverError(403, "Assignment access denied.");
    const latest = await tx.tripLocation.findFirst({ where: { tripId }, orderBy: { recordedAt: "desc" }, select: { recordedAt: true } });
    if (latest && Date.now() - latest.recordedAt.getTime() < 10000) throw new DriverError(429, "Wait before sending another location.");
    // Historical rows are untrusted. New rows have a matching audit attestation,
    // committed in the same transaction; customer tracking requires that marker.
    const row = await tx.tripLocation.create({ data: { ...coords, tripId, driverId: a.driverId, vehicleId: b.vehicleId, source: "MOBILE", recordedAt: new Date() }, select: { id: true, recordedAt: true } });
    await tx.auditLog.create({ data: { userId: a.user.id, action: "CREATE", entityName: "TrustedDriverLocation", entityId: row.id, newValue: { tripId } } });
    return row;
  }, { isolationLevel: "Serializable" });
}
