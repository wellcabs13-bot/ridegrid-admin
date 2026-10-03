import { Prisma } from "@prisma/client";
export const documentSelect = {
  id: true,
  documentType: true,
  status: true,
  expiryDate: true,
  issueDate: true,
  fileUrl: true,
} as const;
export const vehicleSelect = {
  id: true,
  registrationNumber: true,
  make: true,
  model: true,
  category: true,
  seatingCapacity: true,
  fuelType: true,
  transmission: true,
  homeCity: true,
  status: true,
  isVerified: true,
  driverId: true,
  driver: {
    select: { id: true, firstName: true, lastName: true, status: true },
  },
  documents: { select: documentSelect },
} satisfies Prisma.VehicleSelect;
export const bookingSelect = {
  id: true,
  bookingNumber: true,
  pickupLocation: true,
  dropLocation: true,
  pickupDateTime: true,
  reservedFrom: true,
  reservedUntil: true,
  tripDays: true,
  tripType: true,
  status: true,
  vendorEarning: true,
  vehicleId: true,
  driverId: true,
  vehicle: {
    select: {
      id: true,
      registrationNumber: true,
      make: true,
      model: true,
      driverId: true,
    },
  },
  driver: { select: { id: true, firstName: true, lastName: true } },
  customer: { select: { firstName: true, lastName: true } },
  pricingPackage: { select: { packageName: true, packageType: true } },
  trip: {
    select: { status: true, tripStartedAt: true, tripCompletedAt: true },
  },
} satisfies Prisma.BookingSelect;
