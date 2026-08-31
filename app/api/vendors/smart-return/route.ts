import { NextRequest, NextResponse } from "next/server";
import { TripType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  evaluateSmartReturnEligibility,
} from "@/lib/services/smart-return/SmartReturnEligibilityService";

export async function GET(req: NextRequest) {
  try {
    const vendorId = req.nextUrl.searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        { success: false, message: "Vendor ID is required." },
        { status: 400 }
      );
    }

    const trips = await prisma.trip.findMany({
      where: {
        status: "COMPLETED",
        deletedAt: null,
        vehicle: {
          vendorId,
          deletedAt: null,
        },
        booking: {
          deletedAt: null,
        },
      },
      include: {
        vehicle: true,
        booking: true,
        returnApprovals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        tripCompletedAt: "desc",
      },
      take: 100,
    });

    const candidates = trips.map((trip) => {
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

      const approval = trip.returnApprovals[0];

      return {
        trip,
        booking,
        vehicle,
        eligibility,
        approval,
      };
    });

    const opportunities = candidates
      .filter(({ eligibility, approval }) => {
        if (!eligibility.eligible) return false;

        return !approval || approval.status === "REJECTED";
      })
      .map(({ trip, booking, vehicle, approval }) => {
        const baseFare = Number(vehicle.baseFare);
        const suggestedFare =
          Math.round(baseFare * 0.85 * 100) / 100;

        return {
          tripId: trip.id,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,

          eligibility: {
            eligible: true,
            tripType: TripType.ONEWAY,
            rule: "OUTSTATION_ONE_WAY_COMPLETED",
          },

          route: {
            originalPickup: booking.pickupLocation,
            originalDrop: booking.dropLocation,
            suggestedPickup: booking.dropLocation,
            suggestedDrop: booking.pickupLocation,
          },

          completedAt: trip.tripCompletedAt,

          vehicle: {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            category: vehicle.category,
            registrationNumber: vehicle.registrationNumber,
            homeCity: vehicle.homeCity,
          },

          vendor: {
            id: vehicle.vendorId,
          },

          pricing: {
            baseFare,
            suggestedReturnFare: suggestedFare,
            suggestedDiscountPercent: 15,
          },

          approvalStatus: approval?.status ?? "NOT_REQUESTED",

          status: "PENDING_APPROVAL",
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        vendorId,
        opportunities,
        total: opportunities.length,
        eligibilityRule: "COMPLETED_OUTSTATION_ONE_WAY_ONLY",
      },
    });
  } catch (error) {
    console.error("GET /api/vendors/smart-return error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to calculate Smart Return opportunities.",
      },
      { status: 500 }
    );
  }
}