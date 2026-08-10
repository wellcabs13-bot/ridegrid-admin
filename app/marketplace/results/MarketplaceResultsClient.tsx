"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type Listing = {
  id: string;

  vehicle: {
    make: string;
    model: string;
    variant?: string | null;
    year?: number | null;
    category: string;
    fuelType: string;
    transmission: string;
    seatingCapacity: number;
    luggageCapacity?: number | null;
    color?: string | null;
  };

  location: {
    city: string;
  };

  pricing: {
    baseFare: number;
    pricePerKm: number | null;
    waitingCharge?: number | null;
    nightCharge?: number | null;
  };

  marketplace: {
    rating: number;
    totalTrips: number;
    verified: boolean;
    status: string;
    available?: boolean;
  };

  vendor: {
    id: string;
    companyName: string;
    name?: string;
    mobile?: string | null;
  } | null;

  driver?: {
    id: string;
    name: string;
    mobile?: string | null;
  } | null;
};

type SearchResponse = {
  search?: {
    serviceType?: string | null;
    tripType?: string | null;
    pickupCity?: string | null;
    dropCity?: string | null;
    date?: string | null;
    time?: string | null;
    category?: string | null;
  };

  listings?: Listing[];

  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function formatCategory(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatTripType(value: string) {
  switch (value) {
    case "ROUNDTRIP":
      return "Round Trip";

    case "MULTICITY":
      return "Multi City";

    default:
      return "One Way";
  }
}

function formatServiceType(value: string) {
  switch (value) {
    case "OUTSTATION":
      return "Outstation";

    case "LOCAL":
      return "Local";

    case "AIRPORT":
    case "AIRPORT_TRANSFER":
      return "Airport Transfer";

    case "TOUR":
    case "TOUR_PACKAGE":
      return "Tour Package";

    case "CORPORATE":
      return "Corporate";

    default:
      return value
        ? value
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, (letter) =>
              letter.toUpperCase()
            )
        : "Marketplace";
  }
}

function formatDate(value: string) {
  if (!value) {
    return "Date not selected";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatCurrency(value: number) {
  return `â‚¹${value.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  )}`;
}

export default function MarketplaceResultsPage() {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const serviceType =
    searchParams.get(
      "serviceType"
    ) || "";

  const tripType =
    searchParams.get(
      "tripType"
    ) || "ONEWAY";

  const pickupCity =
    searchParams.get(
      "pickupCity"
    ) || "";

  const dropCity =
    searchParams.get(
      "dropCity"
    ) || "";

  const date =
    searchParams.get("date") ||
    "";

  const time =
    searchParams.get("time") ||
    "";

  const category =
    searchParams.get(
      "category"
    ) || "";

  const [listings, setListings] =
    useState<Listing[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [sortBy, setSortBy] =
    useState("recommended");

  const [selectedListingId, setSelectedListingId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadListings() {
      try {
        setLoading(true);
        setError("");

        const params =
          new URLSearchParams();

        params.set("page", "1");
        params.set("limit", "100");

        if (serviceType) {
          params.set(
            "serviceType",
            serviceType
          );
        }

        if (tripType) {
          params.set(
            "tripType",
            tripType
          );
        }

        if (pickupCity) {
          params.set(
            "pickupCity",
            pickupCity
          );
        }

        if (dropCity) {
          params.set(
            "dropCity",
            dropCity
          );
        }

        if (date) {
          params.set(
            "date",
            date
          );
        }

        if (time) {
          params.set(
            "time",
            time
          );
        }

        if (category) {
          params.set(
            "category",
            category
          );
        }

        const response =
          await fetch(
            `/api/marketplace/search?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load marketplace listings."
          );
        }

        if (!cancelled) {
          const data =
            result.data as SearchResponse;

          setListings(
            data.listings ?? []
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load marketplace listings."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadListings();

    return () => {
      cancelled = true;
    };
  }, [
    serviceType,
    tripType,
    pickupCity,
    dropCity,
    date,
    time,
    category,
  ]);

  const sortedListings =
    useMemo(() => {
      const items = [
        ...listings,
      ];

      switch (sortBy) {
        case "price_low":
          return items.sort(
            (a, b) =>
              a.pricing.baseFare -
              b.pricing.baseFare
          );

        case "price_high":
          return items.sort(
            (a, b) =>
              b.pricing.baseFare -
              a.pricing.baseFare
          );

        case "rating":
          return items.sort(
            (a, b) =>
              b.marketplace.rating -
              a.marketplace.rating
          );

        case "trips":
          return items.sort(
            (a, b) =>
              b.marketplace.totalTrips -
              a.marketplace.totalTrips
          );

        default:
          return items.sort(
            (a, b) => {
              const ratingDifference =
                b.marketplace.rating -
                a.marketplace.rating;

              if (
                ratingDifference !== 0
              ) {
                return ratingDifference;
              }

              return (
                b.marketplace.totalTrips -
                a.marketplace.totalTrips
              );
            }
          );
      }
    }, [
      listings,
      sortBy,
    ]);

  function handleBook(
    listing: Listing
  ) {
    setSelectedListingId(
      listing.id
    );

    const params =
      new URLSearchParams({
        listingId:
          listing.id,

        serviceType,

        tripType,

        pickupCity,

        dropCity,

        date,

        time,
      });

    if (category) {
      params.set(
        "category",
        category
      );
    }

    router.push(
      `/marketplace/booking?${params.toString()}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/marketplace"
              )
            }
            className="mb-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            â† Modify Search
          </button>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {formatServiceType(
                    serviceType
                  )}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {formatTripType(
                    tripType
                  )}
                </span>

                {category && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    {formatCategory(
                      category
                    )}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Available Vehicles
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Compare verified vehicles,
                vendors, drivers and pricing
                before choosing your ride.
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 px-5 py-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Journey
              </div>

              <div className="mt-1 font-bold text-slate-900">
                {pickupCity || "Pickup"}
                <span className="mx-2 text-slate-400">
                  â†’
                </span>
                {dropCity || "Drop"}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                {formatDate(date)}
                {time
                  ? ` â€¢ ${time}`
                  : ""}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Search Summary */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            label="Service"
            value={
              formatServiceType(
                serviceType
              )
            }
          />

          <SummaryCard
            label="Trip"
            value={
              formatTripType(
                tripType
              )
            }
          />

          <SummaryCard
            label="Pickup"
            value={
              pickupCity ||
              "Not selected"
            }
          />

          <SummaryCard
            label="Drop"
            value={
              dropCity ||
              "Not selected"
            }
          />

          <SummaryCard
            label="Date & Time"
            value={`${formatDate(
              date
            )}${time ? ` â€¢ ${time}` : ""}`}
          />
        </div>

        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-bold text-slate-900">
              {loading
                ? "Finding vehicles..."
                : `${sortedListings.length} vehicles available`}
            </div>

            <div className="text-sm text-slate-500">
              Showing verified marketplace
              listings matching your search.
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label
              htmlFor="sort"
              className="text-sm font-medium text-slate-500"
            >
              Sort
            </label>

            <select
              id="sort"
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
                )
              }
              className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="recommended">
                Recommended
              </option>

              <option value="price_low">
                Price: Low to High
              </option>

              <option value="price_high">
                Price: High to Low
              </option>

              <option value="rating">
                Highest Rated
              </option>

              <option value="trips">
                Most Trips
              </option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="rounded-2xl border bg-white p-16 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            <p className="mt-4 font-semibold text-slate-700">
              Finding the best available
              vehicles...
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Checking marketplace availability.
            </p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <h2 className="font-bold text-red-800">
              Unable to load vehicles
            </h2>

            <p className="mt-2 text-sm text-red-600">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-5 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading &&
          !error &&
          sortedListings.length === 0 && (
            <div className="rounded-2xl border bg-white p-14 text-center shadow-sm">
              <div className="text-4xl">
                ðŸš—
              </div>

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                No vehicles available
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                We couldn&apos;t find a verified
                vehicle matching this journey.
                Try another pickup city,
                category or time.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/marketplace"
                  )
                }
                className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Modify Search
              </button>
            </div>
          )}

        {/* Listings */}
        {!loading &&
          !error &&
          sortedListings.length > 0 && (
            <div className="space-y-4">
              {sortedListings.map(
                (listing) => (
                  <MarketplaceListingCard
                    key={listing.id}
                    listing={listing}
                    onBook={handleBook}
                    bookingLoading={
                      selectedListingId ===
                      listing.id
                    }
                  />
                )
              )}
            </div>
          )}
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 truncate text-sm font-bold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function MarketplaceListingCard({
  listing,
  onBook,
  bookingLoading,
}: {
  listing: Listing;
  onBook: (
    listing: Listing
  ) => void;
  bookingLoading: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md">
      <div className="p-5">
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          {/* Vehicle */}
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {listing.vehicle.make}{" "}
                    {listing.vehicle.model}
                  </h2>

                  {listing.marketplace
                    .verified && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      âœ“ Verified
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {listing.vehicle.variant ||
                    "Standard"}
                  {listing.vehicle.year
                    ? ` â€¢ ${listing.vehicle.year}`
                    : ""}
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-amber-50 px-3 py-2">
                <span className="text-amber-500">
                  â˜…
                </span>

                <span className="font-bold text-slate-800">
                  {Number(
                    listing.marketplace
                      .rating || 0
                  ).toFixed(1)}
                </span>

                <span className="text-xs text-slate-500">
                  ({listing.marketplace.totalTrips}{" "}
                  trips)
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <VehicleAttribute
                label="Category"
                value={formatCategory(
                  listing.vehicle
                    .category
                )}
              />

              <VehicleAttribute
                label="Capacity"
                value={`${listing.vehicle.seatingCapacity} Seats`}
              />

              <VehicleAttribute
                label="Fuel"
                value={formatCategory(
                  listing.vehicle
                    .fuelType
                )}
              />

              <VehicleAttribute
                label="Transmission"
                value={formatCategory(
                  listing.vehicle
                    .transmission
                )}
              />
            </div>

            {/* Vendor + Driver */}
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Vendor
                </div>

                <div className="mt-1 font-bold text-slate-800">
                  {listing.vendor
                    ?.companyName ||
                    "Verified Vendor"}
                </div>

                {listing.vendor
                  ?.name && (
                  <div className="mt-1 text-sm text-slate-500">
                    Contact:{" "}
                    {listing.vendor.name}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Driver
                </div>

                <div className="mt-1 font-bold text-slate-800">
                  {listing.driver
                    ?.name ||
                    "Driver assigned by vendor"}
                </div>

                <div className="mt-1 text-sm text-emerald-600">
                  Available for booking
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex flex-col justify-between rounded-2xl bg-slate-50 p-5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Starting Fare
              </div>

              <div className="mt-2 text-3xl font-black text-slate-900">
                {formatCurrency(
                  listing.pricing
                    .baseFare
                )}
              </div>

              {listing.pricing
                .pricePerKm !==
                null && (
                <div className="mt-1 text-sm text-slate-500">
                  {formatCurrency(
                    listing.pricing
                      .pricePerKm
                  )}{" "}
                  / km
                </div>
              )}

              {listing.pricing
                .waitingCharge !==
                null &&
                listing.pricing
                  .waitingCharge !==
                  undefined && (
                  <div className="mt-3 text-xs text-slate-500">
                    Waiting:{" "}
                    {formatCurrency(
                      listing.pricing
                        .waitingCharge
                    )}
                  </div>
                )}
            </div>

            <div className="mt-6">
              <div className="mb-3 text-center text-xs font-medium text-emerald-600">
                âœ“ Available for your journey
              </div>

              <button
                type="button"
                disabled={
                  bookingLoading
                }
                onClick={() =>
                  onBook(listing)
                }
                className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {bookingLoading
                  ? "Opening..."
                  : "Select & Book"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-slate-50 px-5 py-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
          <span>
            ðŸ“{" "}
            {listing.location.city}
          </span>

          {listing.vehicle
            .luggageCapacity !==
            null &&
            listing.vehicle
              .luggageCapacity !==
              undefined && (
              <span>
                ðŸ§³{" "}
                {
                  listing.vehicle
                    .luggageCapacity
                }{" "}
                bags
              </span>
            )}

          {listing.vehicle
            .color && (
            <span>
              Color:{" "}
              {listing.vehicle.color}
            </span>
          )}

          <span>
            {listing.marketplace
              .totalTrips}{" "}
            completed trips
          </span>
        </div>
      </div>
    </article>
  );
}

function VehicleAttribute({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs font-medium text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-sm font-bold text-slate-700">
        {value}
      </div>
    </div>
  );
}
