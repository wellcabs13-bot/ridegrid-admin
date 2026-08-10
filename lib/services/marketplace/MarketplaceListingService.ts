import {
  Prisma,
  VehicleStatus,
} from "@prisma/client";

import {
  vehicleRepository,
} from "@/lib/repositories/vehicle";

export interface MarketplaceListingFilters {
  serviceType?: string;
  tripType?: string;

  pickupCity?: string;
  dropCity?: string;

  date?: string;
  time?: string;

  city?: string;
  category?: string;
  search?: string;

  page?: number;
  limit?: number;
}

export class MarketplaceListingService {
  async search(
    filters: MarketplaceListingFilters = {}
  ) {
    const page = Math.max(
      1,
      filters.page ?? 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        filters.limit ?? 20
      )
    );

    const pickupCity =
      filters.pickupCity?.trim() ||
      filters.city?.trim() ||
      "";

    const dropCity =
      filters.dropCity?.trim() ||
      "";

    const search =
      filters.search?.trim() ||
      "";

    /*
     * Convert customer search date/time
     * into a single marketplace datetime.
     */
    let pickupDateTime:
      | Date
      | undefined;

    if (
      filters.date &&
      filters.time
    ) {
      const parsed =
        new Date(
          `${filters.date}T${filters.time}:00`
        );

      if (
        !Number.isNaN(
          parsed.getTime()
        )
      ) {
        pickupDateTime = parsed;
      }
    }

    /*
     * Base marketplace eligibility.
     */
    const where:
      Prisma.VehicleWhereInput = {
        deletedAt: null,

        status:
          VehicleStatus.AVAILABLE,

        isVerified: true,
      };

    /*
     * Vehicle operating city.
     */
    if (pickupCity) {
      where.homeCity = {
        contains: pickupCity,
        mode: "insensitive",
      };
    }

    /*
     * General vehicle search.
     */
    if (search) {
      where.OR = [
        {
          make: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          model: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          variant: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          homeCity: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    /*
     * Category filter.
     */
    if (filters.category) {
      where.category =
        filters.category as Prisma.VehicleWhereInput["category"];
    }

    /*
     * Get marketplace-eligible vehicles
     * with availability checking.
     */
    const vehicles =
      await vehicleRepository.findMarketplaceAvailable(
        where,
        pickupDateTime
      );

    const total =
      vehicles.length;

    const start =
      (page - 1) * limit;

    const paginated =
      vehicles.slice(
        start,
        start + limit
      );

    return {
      search: {
        serviceType:
          filters.serviceType ||
          null,

        tripType:
          filters.tripType ||
          null,

        pickupCity:
          pickupCity || null,

        dropCity:
          dropCity || null,

        date:
          filters.date ||
          null,

        time:
          filters.time ||
          null,

        category:
          filters.category ||
          null,
      },

      listings:
        paginated.map(
          (vehicle) => ({
            id: vehicle.id,

            vehicle: {
              make: vehicle.make,

              model: vehicle.model,

              variant:
                vehicle.variant,

              year:
                vehicle.year,

              category:
                vehicle.category,

              fuelType:
                vehicle.fuelType,

              transmission:
                vehicle.transmission,

              seatingCapacity:
                vehicle.seatingCapacity,

              luggageCapacity:
                vehicle.luggageCapacity,

              color:
                vehicle.color,
            },

            location: {
              city:
                vehicle.homeCity,
            },

            pricing: {
              baseFare:
                Number(
                  vehicle.baseFare
                ),

              pricePerKm:
                vehicle.pricePerKm
                  ? Number(
                      vehicle.pricePerKm
                    )
                  : null,

              waitingCharge:
                vehicle.waitingCharge
                  ? Number(
                      vehicle.waitingCharge
                    )
                  : null,

              nightCharge:
                vehicle.nightCharge
                  ? Number(
                      vehicle.nightCharge
                    )
                  : null,
            },

            marketplace: {
              rating:
                vehicle.rating,

              totalTrips:
                vehicle.totalTrips,

              verified:
                vehicle.isVerified,

              status:
                vehicle.status,

              available:
                true,
            },

            vendor:
              vehicle.vendor
                ? {
                    id:
                      vehicle.vendor
                        .id,

                    companyName:
                      vehicle.vendor
                        .companyName,

                    name:
                      vehicle.vendor
                        .user?.name ||
                      "",

                    mobile:
                      vehicle.vendor
                        .user?.mobile ||
                      null,
                  }
                : null,

            driver:
              vehicle.driver
                ? {
                    id:
                      vehicle.driver
                        .id,

                    name:
                      vehicle.driver
                        .user?.name ||
                      "",

                    mobile:
                      vehicle.driver
                        .user?.mobile ||
                      null,
                  }
                : null,
          })
        ),

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit
          ),
      },
    };
  }
}

export const marketplaceListingService =
  new MarketplaceListingService();