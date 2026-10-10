import { prisma } from "@/lib/prisma";
import { marketplaceListingService } from "./MarketplaceListingService";

export interface MarketplaceTwinFilters {
  city?: string;
  vendorId?: string;
}

export class MarketplaceTwinService {
  async getTwin(filters: MarketplaceTwinFilters = {}) {
    const listingResult =
      await marketplaceListingService.search({
        city: filters.city,
        page: 1,
        limit: 100,
      });

    const where = {
      deletedAt: null,
      ...(filters.vendorId
        ? { vendorId: filters.vendorId }
        : {}),
      ...(filters.city
        ? {
            pickupLocation: {
              contains: filters.city,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const [
      totalBookings,
      completedTrips,
      activeVehicles,
      activeVendors,
      recentBookings,
    ] = await Promise.all([
      prisma.booking.count({ where }),

      prisma.trip.count({
        where: {
          status: "COMPLETED",
          deletedAt: null,
          ...(filters.vendorId
            ? {
                vehicle: {
                  vendorId: filters.vendorId,
                },
              }
            : {}),
        },
      }),

      prisma.vehicle.count({
        where: {
          deletedAt: null,
          status: "AVAILABLE",
          isVerified: true,
          ...(filters.vendorId
            ? { vendorId: filters.vendorId }
            : {}),
          ...(filters.city
            ? {
                homeCity: {
                  contains: filters.city,
                  mode: "insensitive",
                },
              }
            : {}),
        },
      }),

      prisma.vendor.count({
        where: {
          ...(filters.vendorId
            ? { id: filters.vendorId }
            : {}),
          deletedAt: null,
        },
      }),

      prisma.booking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          pickupLocation: true,
          dropLocation: true,
          status: true,
          estimatedFare: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      }),
    ]);

    const marketplaceHealth =
      activeVehicles > 0
        ? Math.min(
            100,
            Math.round(
              ((activeVehicles + completedTrips) /
                (activeVehicles + completedTrips + totalBookings + 1)) *
                100
            )
          )
        : 0;

    return {
      twin: {
        scope: {
          city: filters.city ?? null,
          vendorId: filters.vendorId ?? null,
        },

        marketplace: {
          listingCount:
            listingResult.listings.length,
          availableVehicles: activeVehicles,
          activeVendors,
          marketplaceHealth,
        },

        demand: {
          totalBookings,
          completedTrips,
        },

        recentBookings,

        listings:
          listingResult.listings,

        generatedAt: new Date(),
      },
    };
  }
}

export const marketplaceTwinService =
  new MarketplaceTwinService();
