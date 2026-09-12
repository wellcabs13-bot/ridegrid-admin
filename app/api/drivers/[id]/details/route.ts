import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Driver ID is required.",
        },
        { status: 400 }
      );
    }

    const driver = await prisma.driver.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        user: true,

        vehicles: {
          where: {
            deletedAt: null,
          },
          include: {
            vendor: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },

        bookings: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            pickupDateTime: "desc",
          },
          take: 50,
          select: {
            id: true,
            bookingNumber: true,
            pickupLocation: true,
            dropLocation: true,
            pickupDateTime: true,
            status: true,
            estimatedFare: true,
            finalFare: true,
            driverPayout: true,
            vehicleId: true,
          },
        },

        trips: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
          include: {
            booking: {
              select: {
                bookingNumber: true,
                pickupLocation: true,
                dropLocation: true,
                pickupDateTime: true,
                status: true,
                estimatedFare: true,
                finalFare: true,
                driverPayout: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                registrationNumber: true,
                make: true,
                model: true,
              },
            },
          },
        },

        attendance: {
          orderBy: {
            attendanceDate: "desc",
          },
          take: 100,
        },

        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },

        payrolls: {
          orderBy: [
            {
              year: "desc",
            },
            {
              month: "desc",
            },
          ],
          take: 24,
        },

        incentives: {
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        },

        penalties: {
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        },

        performanceReports: {
          orderBy: {
            reportDate: "desc",
          },
          take: 24,
        },

        reviews: {
          orderBy: {
            createdAt: "desc",
          },
          take: 100,
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        {
          success: false,
          message: "Driver not found.",
        },
        { status: 404 }
      );
    }

    const completedTrips = driver.trips.filter(
      (trip) =>
        trip.status === "COMPLETED"
    );

    const totalDriverPayout = driver.bookings.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.driverPayout ??
            booking.finalFare ??
            booking.estimatedFare ??
            0
        ),
      0
    );

    const totalIncentives =
      driver.incentives.reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );

    const totalPenalties =
      driver.penalties.reduce(
        (sum, item) =>
          sum + Number(item.amount),
        0
      );

    const presentDays =
      driver.attendance.filter(
        (item) =>
          String(item.status).toUpperCase() ===
          "PRESENT"
      ).length;

    const absentDays =
      driver.attendance.filter(
        (item) =>
          String(item.status).toUpperCase() ===
          "ABSENT"
      ).length;

    const workingHours =
      driver.attendance.reduce(
        (sum, item) => {
          if (
            item.checkIn &&
            item.checkOut
          ) {
            return (
              sum +
              (new Date(item.checkOut).getTime() -
                new Date(item.checkIn).getTime()) /
                3600000
            );
          }

          return sum;
        },
        0
      );

    const totalAttendance =
      driver.attendance.length;

    const attendancePercentage =
      totalAttendance > 0
        ? (presentDays /
            totalAttendance) *
          100
        : 0;

    const latestPerformance =
      driver.performanceReports[0] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        driver,
        summary: {
          totalTrips:
            driver.trips.length,

          completedTrips:
            completedTrips.length,

          totalDriverPayout,

          totalIncentives,

          totalPenalties,

          netEarnings:
            totalDriverPayout +
            totalIncentives -
            totalPenalties,

          presentDays,

          absentDays,

          workingHours:
            Math.round(
              workingHours * 100
            ) / 100,

          attendancePercentage:
            Math.round(
              attendancePercentage * 100
            ) / 100,

          latestPerformance,
        },
      },
    });
  } catch (error) {
    console.error(
      "GET /api/drivers/[id]/details",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load driver details.",
      },
      { status: 500 }
    );
  }
}
