import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const vendorId =
      req.nextUrl.searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor ID is required.",
        },
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
        vehicle: {
          include: {
            vendor: {
              include: {
                user: true,
              },
            },
          },
        },
        booking: true,
        returnApprovals: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        tripCompletedAt: "desc",
      },
      take: 50,
    });

    const opportunities = trips
      .filter((trip) => {
        const approval = trip.returnApprovals[0];

        return !approval || approval.status === "REJECTED";
      })
      .map((trip) => {
        const booking = trip.booking;
        const vehicle = trip.vehicle;

        const baseFare = Number(vehicle.baseFare);

        // Smart Return uses the existing vehicle pricing.
        // A conservative 15% return opportunity discount is suggested,
        // without changing the stored vehicle pricing.
        const suggestedFare = Math.round(
          baseFare * 0.85 * 100
        ) / 100;

        return {
          tripId: trip.id,
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,

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
            registrationNumber:
              vehicle.registrationNumber,
            homeCity: vehicle.homeCity,
          },

          vendor: vehicle.vendor
            ? {
                id: vehicle.vendor.id,
                companyName:
                  vehicle.vendor.companyName,
              }
            : null,

          pricing: {
            baseFare,
            suggestedReturnFare: suggestedFare,
            suggestedDiscountPercent: 15,
          },

          status: "RETURN_OPPORTUNITY",
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        vendorId,
        opportunities,
        total: opportunities.length,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/vendors/smart-return error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to calculate Smart Return opportunities.",
      },
      { status: 500 }
    );
  }
}