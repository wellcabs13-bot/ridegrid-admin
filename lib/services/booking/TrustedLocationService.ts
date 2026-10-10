import { prisma } from "@/lib/prisma";

// Returns only a fresh (two-minute) Driver App location whose driver and vehicle match
// the trip and booking and which carries a TrustedDriverLocation attestation.
export async function trustedTripLocation(
  bookingId: string,
  booking: { status: string; trip: { deletedAt: Date | null } | null }
) {
  if (!["DRIVER_ASSIGNED", "TRIP_STARTED"].includes(booking.status) || !booking.trip || booking.trip.deletedAt) return null;
  const row = await prisma.tripLocation.findFirst({ where: { trip: { bookingId, deletedAt: null, status: { in: ["ARRIVED_AT_PICKUP", "STARTED", "PASSENGER_ONBOARD"] } }, source: "MOBILE", recordedAt: { gte: new Date(Date.now() - 120000) } }, orderBy: { recordedAt: "desc" }, select: { id: true, driverId: true, vehicleId: true, latitude: true, longitude: true, accuracy: true, recordedAt: true, trip: { select: { driverId: true, vehicleId: true, booking: { select: { driverId: true, vehicleId: true } } } } } });
  if (row && row.driverId === row.trip.driverId && row.driverId === row.trip.booking.driverId && row.vehicleId === row.trip.vehicleId && row.vehicleId === row.trip.booking.vehicleId && await prisma.auditLog.findFirst({ where: { entityName: "TrustedDriverLocation", entityId: row.id, action: "CREATE" }, select: { id: true } }))
    return { latitude: Number(row.latitude), longitude: Number(row.longitude), accuracy: row.accuracy, recordedAt: row.recordedAt };
  return null;
}
