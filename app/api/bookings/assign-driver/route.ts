import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { DriverError, required, ok, failure } from "@/lib/driver-mobile/access";
import { bookingReservationWindow, findBookingConflict } from "@/lib/services/marketplace/BookingAvailabilityService";
export async function POST(req: NextRequest) {
  try {
    const access = await requestPermission(req, Permission.BOOKING_UPDATE); if (access.denied) return access.denied;
    const body = await req.json(), bookingId = required(body.bookingId, "booking"), driverId = required(body.driverId, "driver");
    const booking = await prisma.$transaction(async tx => {
      const b = await tx.booking.findFirst({ where: { id: bookingId, deletedAt: null }, include: { trip: true, vehicle: { select: { driverId: true, deletedAt: true } } } });
      const d = await tx.driver.findFirst({ where: { id: driverId, status: "ACTIVE", deletedAt: null, user: { isActive: true, deletedAt: null } }, select: { userId: true } });
      if (!b || !d) throw new DriverError(404, "Booking or active driver not found.");
      if (!["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"].includes(b.status) || b.vehicle.deletedAt || b.vehicle.driverId !== driverId || (b.trip && b.trip.status !== "ASSIGNED")) throw new DriverError(409, "Confirm the booked vehicle's aligned driver before the trip begins.");
      if (await findBookingConflict(tx, { vehicleId: b.vehicleId, driverId, window: bookingReservationWindow(b), excludeBookingId: b.id })) throw new DriverError(409, "Driver or vehicle has a conflicting booking.");
      if (b.status === "DRIVER_ASSIGNED" && b.driverId === driverId) return { id: b.id, status: b.status };
      const updated = await tx.booking.update({ where: { id: b.id }, data: { driverId, status: "DRIVER_ASSIGNED" } });
      if (b.trip) await tx.trip.update({ where: { id: b.trip.id }, data: { driverId, vehicleId: b.vehicleId, driverAssignedAt: new Date() } });
      await tx.bookingStatusHistory.create({ data: { bookingId, previousStatus: b.status, currentStatus: "DRIVER_ASSIGNED", action: b.driverId && b.driverId !== driverId ? "REASSIGNED" : "ASSIGNED", changedBy: access.user!.id } });
      await tx.notification.create({ data: { userId: d.userId, notificationType: "PUSH", title: "New driver assignment", message: `${b.bookingNumber}: your assignment is ready. Open My Trips for details.` } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return ok(booking);
  } catch (e) { return failure(e); }
}
