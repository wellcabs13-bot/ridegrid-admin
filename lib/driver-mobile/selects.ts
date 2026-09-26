import { Prisma } from "@prisma/client";
export const vehicleSelect = { id: true, make: true, model: true, registrationNumber: true, category: true, fuelType: true, transmission: true, vendor: { select: { companyName: true } } } satisfies Prisma.VehicleSelect;
export const documentSelect = { id: true, documentType: true, status: true, expiryDate: true, verifiedAt: true } satisfies Prisma.DriverDocumentSelect;
export const bookingSelect = {
  id: true, bookingNumber: true, status: true, pickupLocation: true, dropLocation: true, pickupDateTime: true, tripType: true,
  vehicle: { select: vehicleSelect }, vendor: { select: { companyName: true } },
  customer: { select: { firstName: true, lastName: true } },
  pricingPackage: { select: { packageName: true, packageType: true } },
  trip: { select: { id: true, status: true, deletedAt: true, driverAssignedAt: true, arrivedPickupAt: true, tripStartedAt: true, tripCompletedAt: true } },
} satisfies Prisma.BookingSelect;
export function safeBooking<T extends { status: string; trip: { deletedAt: Date | null } | null }>(booking: T) {
  return { ...booking, trip: booking.trip?.deletedAt ? null : booking.trip };
}
