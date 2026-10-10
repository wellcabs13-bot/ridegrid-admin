import { BookingStatus, DriverStatus, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trustedTripLocation } from "@/lib/services/booking/TrustedLocationService";
import { addDays } from "@/lib/services/admin/metrics";

// Live operations from real rows only. A ride's position is shown solely when the
// Driver App sent a fresh (2 minute) location that passes the same TrustedDriverLocation
// attestation the customer trip-status API requires. Nothing is simulated or estimated.
const HOUR = 3_600_000;
const MAX_RIDES = 40;

export async function liveOperations() {
  const now = new Date();
  const activeWhere = {
    deletedAt: null,
    OR: [
      { status: BookingStatus.TRIP_STARTED },
      // Assigned rides that are about to start (or just started late); older stale assignments are not "live".
      { status: BookingStatus.DRIVER_ASSIGNED, pickupDateTime: { gte: new Date(now.getTime() - 12 * HOUR), lt: new Date(now.getTime() + 24 * HOUR) } },
    ],
  };
  const activeVendor = { deletedAt: null, suspendedAt: null, isApproved: true, user: { isActive: true, deletedAt: null } };
  const [rows, activeRides, onTrip, busyDrivers, activeDrivers, availableVehicles, vehiclesOnTrip, activeVendors, unassigned24h] = await Promise.all([
    prisma.booking.findMany({
      where: activeWhere, take: MAX_RIDES, orderBy: [{ status: "desc" }, { pickupDateTime: "asc" }],
      select: {
        id: true, bookingNumber: true, status: true, pickupLocation: true, dropLocation: true, pickupDateTime: true,
        customer: { select: { firstName: true, lastName: true } },
        vendor: { select: { companyName: true } },
        vehicle: { select: { make: true, model: true, registrationNumber: true } },
        driver: { select: { firstName: true, lastName: true } },
        trip: { select: { status: true, deletedAt: true } },
      },
    }),
    prisma.booking.count({ where: activeWhere }),
    prisma.booking.count({ where: { deletedAt: null, status: BookingStatus.TRIP_STARTED } }),
    prisma.booking.findMany({ where: { deletedAt: null, status: BookingStatus.TRIP_STARTED, driverId: { not: null } }, distinct: ["driverId"], select: { driverId: true } }),
    prisma.driver.count({ where: { deletedAt: null, status: DriverStatus.ACTIVE, user: { isActive: true, deletedAt: null } } }),
    prisma.vehicle.count({ where: { deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true } }),
    prisma.vehicle.count({ where: { deletedAt: null, status: VehicleStatus.ON_TRIP } }),
    prisma.vendor.count({ where: activeVendor }),
    prisma.booking.count({ where: { deletedAt: null, status: { in: [BookingStatus.CONFIRMED] }, driverId: null, pickupDateTime: { gte: now, lt: addDays(now, 1) } } }),
  ]);
  const rides = await Promise.all(rows.map(async b => {
    const location = await trustedTripLocation(b.id, { status: b.status, trip: b.trip });
    return {
      id: b.id, bookingNumber: b.bookingNumber, status: b.status, tripStatus: b.trip && !b.trip.deletedAt ? b.trip.status : null,
      pickupLocation: b.pickupLocation, dropLocation: b.dropLocation, pickupDateTime: b.pickupDateTime,
      customer: `${b.customer.firstName} ${b.customer.lastName}`.trim(),
      vendor: b.vendor.companyName,
      vehicle: { label: `${b.vehicle.make} ${b.vehicle.model}`.trim(), registrationNumber: b.vehicle.registrationNumber },
      driver: b.driver ? `${b.driver.firstName} ${b.driver.lastName}`.trim() : null,
      location,
    };
  }));
  // A trip in progress with no fresh trusted location is flagged so operations can follow up.
  const noLocation = rides.filter(r => r.status === BookingStatus.TRIP_STARTED && !r.location).length;
  return {
    generatedAt: now,
    kpis: {
      activeRides, onTrip,
      availableDrivers: Math.max(activeDrivers - busyDrivers.length, 0),
      availableVehicles, vehiclesOnTrip, activeVendors,
      issues: { unassigned24h, tripsWithoutLocation: noLocation },
    },
    rides, shown: rides.length, truncated: activeRides > rides.length,
  };
}
