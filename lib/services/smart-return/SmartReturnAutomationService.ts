import { prisma } from "@/lib/prisma";
import { TripType } from "@prisma/client";
import { evaluateSmartReturnEligibility } from "./SmartReturnEligibilityService";

export async function generateSmartReturnListings() {
  const trips = await prisma.trip.findMany({
    where: {
      status: "COMPLETED",
      deletedAt: null,
      booking: {
        deletedAt: null,
        tripType: TripType.ONEWAY,
      },
    },
    include: {
      booking: true,
      vehicle: true,
      returnApprovals: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const trip of trips) {
    const booking = trip.booking;
    const vehicle = trip.vehicle;

    const eligibility = evaluateSmartReturnEligibility({
      tripId: trip.id,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      pickupLocation: booking.pickupLocation,
      dropLocation: booking.dropLocation,
      tripType: booking.tripType,
      tripCompletedAt: trip.tripCompletedAt,
      vendorId: vehicle.vendorId,
      vehicleId: vehicle.id,
    });

    if (!eligibility.eligible) {
      skipped++;
      continue;
    }

    const existing = await prisma.smartReturnListing.findFirst({
      where: {
        tripId: trip.id,
        status: {
          in: ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "BOOKED"],
        },
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const baseFare = Number(vehicle.baseFare);
    const fare = Math.round(baseFare * 0.85 * 100) / 100;

    await prisma.smartReturnListing.create({
      data: {
        tripId: trip.id,
        bookingId: booking.id,
        vendorId: vehicle.vendorId,
        vehicleId: vehicle.id,
        pickupLocation: booking.dropLocation,
        dropLocation: booking.pickupLocation,
        originalPickup: booking.pickupLocation,
        originalDrop: booking.dropLocation,
        baseFare,
        fare,
        discountPercent: 15,
        status: "PENDING_APPROVAL",
      },
    });

    created++;
  }

  return {
    success: true,
    created,
    skipped,
  };
}