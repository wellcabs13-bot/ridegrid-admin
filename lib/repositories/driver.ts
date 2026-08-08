import {
  LocationSource,
  SOSStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class DriverRepository {
  async getDashboard() {
    const [totalDrivers, availableDrivers, runningTrips] =
      await Promise.all([
        prisma.driver.count({
          where: {
            deletedAt: null,
          },
        }),

        prisma.driver.count({
          where: {
            deletedAt: null,
            bookings: {
              none: {
                status: {
                  in: ["TRIP_STARTED"],
                },
              },
            },
          },
        }),

        prisma.trip.count({
          where: {
            status: "STARTED",
          },
        }),
      ]);

    return {
      totalDrivers,
      availableDrivers,
      runningTrips,
    };
  }

  async getDocuments(driverId: string) {
    return prisma.driverDocument.findMany({
      where: {
        driverId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getEarnings(driverId: string) {
    return prisma.booking.findMany({
      where: {
        driverId,
        status: "TRIP_COMPLETED",
      },
      select: {
        id: true,
        bookingNumber: true,
        driverPayout: true,
        pickupDateTime: true,
      },
      orderBy: {
        pickupDateTime: "desc",
      },
    });
  }

  async createLocation(data: {
    tripId: string;
    driverId?: string | null;
    vehicleId?: string | null;
    latitude: number;
    longitude: number;
    speed?: number | null;
    heading?: number | null;
    accuracy?: number | null;
    source: string;
  }) {
    return prisma.tripLocation.create({
      data: {
        trip: {
          connect: {
            id: data.tripId,
          },
        },

        driver: data.driverId
          ? {
              connect: {
                id: data.driverId,
              },
            }
          : undefined,

        vehicle: data.vehicleId
          ? {
              connect: {
                id: data.vehicleId,
              },
            }
          : undefined,

        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed ?? null,
        heading: data.heading ?? null,
        accuracy: data.accuracy ?? null,
        source: data.source as LocationSource,
        recordedAt: new Date(),
      },
    });
  }

  async getNotifications(userId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });
  }

  async getProfile(driverId: string) {
    return prisma.driver.findUnique({
      where: {
        id: driverId,
      },
      include: {
        user: true,
        vehicles: true,
        documents: true,
      },
    });
  }

  async createSOS(data: {
    driverId?: string | null;
    vehicleId?: string | null;
    tripId?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    remarks?: string | null;
    status?: string | null;
  }) {
    return prisma.sOSEvent.create({
      data: {
        driverId: data.driverId || null,
        vehicleId: data.vehicleId || null,
        tripId: data.tripId || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        remarks: data.remarks || null,
        status: (data.status || "OPEN") as SOSStatus,
      },
    });
  }

  async getTodayBookings(driverId: string) {
    return prisma.booking.findMany({
      where: {
        driverId,
      },
      include: {
        customer: true,
        vehicle: true,
      },
      orderBy: {
        pickupDateTime: "asc",
      },
    });
  }

  async getTrips(driverId: string) {
    return prisma.trip.findMany({
      where: {
        driverId,
      },
      include: {
        booking: true,
        vehicle: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}

export const driverRepository =
  new DriverRepository();