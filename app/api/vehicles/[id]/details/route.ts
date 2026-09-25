import { centralFleetAccess } from "@/lib/vendor-mobile/legacy";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; const denied = await centralFleetAccess(_request, "fleet", id); if (denied) return denied;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle ID is required.",
        },
        { status: 400 }
      );
    }

    const vehicle =
      await prisma.vehicle.findUnique({
        where: { id },

        include: {
          vendor: {
            include: {
              user: true,
            },
          },

          driver: {
            include: {
              user: true,
            },
          },

          documents: {
            orderBy: {
              createdAt: "desc",
            },
          },

          maintenanceRecords: {
            orderBy: {
              serviceDate: "desc",
            },
          },

          bookings: {
            where: {
              deletedAt: null,
            },
            include: {
              customer: {
                include: {
                  user: true,
                },
              },
            },
            orderBy: {
              pickupDateTime: "desc",
            },
            take: 20,
          },

          trips: {
            where: {
              deletedAt: null,
            },
            include: {
              booking: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 20,
          },
        },
      });

    if (!vehicle || vehicle.deletedAt) {
      return NextResponse.json(
        {
          success: false,
          message: "Vehicle not found.",
        },
        { status: 404 }
      );
    }

    const photos =
      await prisma.fileAsset.findMany({
        where: {
          entityType: "VEHICLE_PHOTO",
          entityId: vehicle.id,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    const earnings =
      vehicle.bookings.reduce(
        (total, booking) =>
          total +
          Number(
            booking.vendorEarning ??
              booking.finalFare ??
              booking.estimatedFare ??
              0
          ),
        0
      );

    return NextResponse.json({
      success: true,

      data: {
        id: vehicle.id,
        registrationNumber:
          vehicle.registrationNumber,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant,
        year: vehicle.year,
        color: vehicle.color,
        category: vehicle.category,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        seatingCapacity:
          vehicle.seatingCapacity,
        luggageCapacity:
          vehicle.luggageCapacity,
        homeCity: vehicle.homeCity,
        status: vehicle.status,
        baseFare: Number(vehicle.baseFare),
        pricePerKm:
          vehicle.pricePerKm !== null
            ? Number(vehicle.pricePerKm)
            : null,
        waitingCharge:
          vehicle.waitingCharge !== null
            ? Number(vehicle.waitingCharge)
            : null,
        nightCharge:
          vehicle.nightCharge !== null
            ? Number(vehicle.nightCharge)
            : null,
        rating: vehicle.rating,
        totalTrips: vehicle.totalTrips,
        isVerified: vehicle.isVerified,

        vendor: vehicle.vendor
          ? {
              id: vehicle.vendor.id,
              companyName:
                vehicle.vendor.companyName,
              name:
                vehicle.vendor.user?.name ||
                "",
              email:
                vehicle.vendor.user?.email ||
                "",
              mobile:
                vehicle.vendor.user?.mobile ||
                null,
            }
          : null,

        driver: vehicle.driver
          ? {
              id: vehicle.driver.id,
              name:
                vehicle.driver.user?.name ||
                "",
              email:
                vehicle.driver.user?.email ||
                "",
              mobile:
                vehicle.driver.user?.mobile ||
                null,
            }
          : null,

        documents:
          vehicle.documents.map(
            (document) => ({
              id: document.id,
              documentType:
                document.documentType,
              documentNumber:
                document.documentNumber,
              fileUrl:
                document.fileUrl,
              issueDate:
                document.issueDate,
              expiryDate:
                document.expiryDate,
              status:
                document.status,
              remarks:
                document.remarks,
              createdAt:
                document.createdAt,
            })
          ),

        photos:
          photos.map((photo) => ({
            id: photo.id,
            fileName:
              photo.originalName ||
              photo.fileName,
            fileUrl: photo.fileUrl,
            mimeType:
              photo.mimeType,
            createdAt:
              photo.createdAt,
          })),

        bookings:
          vehicle.bookings.map(
            (booking) => ({
              id: booking.id,
              bookingNumber:
                booking.bookingNumber,
              customer:
                booking.customer?.user?.name ||
                `${booking.customer?.firstName || ""} ${booking.customer?.lastName || ""}`.trim() ||
                "Customer",
              pickupLocation:
                booking.pickupLocation,
              dropLocation:
                booking.dropLocation,
              pickupDateTime:
                booking.pickupDateTime,
              status:
                booking.status,
              amount: Number(
                booking.finalFare ??
                  booking.estimatedFare ??
                  0
              ),
            })
          ),

        trips:
          vehicle.trips.map(
            (trip) => ({
              id: trip.id,
              bookingNumber:
                trip.booking?.bookingNumber ||
                "-",
              status:
                trip.status,
              startTime:
                trip.startTime,
              endTime:
                trip.endTime,
              completedAt:
                trip.tripCompletedAt,
            })
          ),

        maintenance:
          vehicle.maintenanceRecords.map(
            (record) => ({
              id: record.id,
              maintenanceType:
                record.maintenanceType,
              priority:
                record.priority,
              status:
                record.status,
              workshopName:
                record.workshopName,
              description:
                record.description,
              cost:
                record.cost !== null
                  ? Number(record.cost)
                  : null,
              serviceDate:
                record.serviceDate,
              nextServiceDate:
                record.nextServiceDate,
            })
          ),

        earnings,
      },
    });
  } catch (error) {
    console.error(
      "GET /api/vehicles/[id]/details failed:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load vehicle details.",
      },
      { status: 500 }
    );
  }
}
