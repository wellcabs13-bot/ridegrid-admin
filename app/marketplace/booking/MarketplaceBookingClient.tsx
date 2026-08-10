"use client";

import { useEffect, useState } from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type AuthUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
};

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    mobile?: string | null;
  };
};

type Listing = {
  id: string;

  vehicle: {
    make: string;
    model: string;
    variant?: string | null;
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

  driver: {
    id: string;
    name: string;
    mobile?: string | null;
  } | null;
};

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

function formatCategory(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatCurrency(value: number) {
  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MarketplaceBookingPage() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const listingId =
    searchParams.get("listingId");

  const serviceType =
    searchParams.get("serviceType") ||
    "OUTSTATION";

  const tripType =
    searchParams.get("tripType") ||
    "ONEWAY";

  const pickupCity =
    searchParams.get("pickupCity") ||
    "";

  const dropCity =
    searchParams.get("dropCity") ||
    "";

  const searchDate =
    searchParams.get("date") || "";

  const searchTime =
    searchParams.get("time") || "";

  const category =
    searchParams.get("category") ||
    "";

  const [listing, setListing] =
    useState<Listing | null>(null);

  const [authUser, setAuthUser] =
    useState<AuthUser | null>(null);

  const [customer, setCustomer] =
    useState<Customer | null>(null);

  const [pickup, setPickup] =
    useState(pickupCity);

  const [drop, setDrop] =
    useState(dropCity);

  const [pickupDateTime, setPickupDateTime] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [customerMobile, setCustomerMobile] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [booking, setBooking] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBookingData() {
      try {
        setLoading(true);
        setMessage("");

        if (!listingId) {
          throw new Error(
            "Vehicle listing is missing."
          );
        }

        /*
         * ========================================================
         * 1. AUTHENTICATED USER
         * ========================================================
         */

        const authResponse =
          await fetch(
            "/api/auth/me",
            {
              cache: "no-store",
            }
          );

        const authResult =
          await authResponse.json();

        if (
          !authResponse.ok ||
          !authResult.success
        ) {
          throw new Error(
            "Please login before creating a booking."
          );
        }

        const user =
          authResult.data as AuthUser;

        if (!cancelled) {
          setAuthUser(user);
        }

        /*
         * ========================================================
         * 2. CUSTOMER PROFILE
         * ========================================================
         */

        if (user.email) {
          const customerResponse =
            await fetch(
              `/api/customers/search?q=${encodeURIComponent(
                user.email
              )}`,
              {
                cache: "no-store",
              }
            );

          const customerResult =
            await customerResponse.json();

          if (
            customerResponse.ok &&
            customerResult.success
          ) {
            const customers =
              customerResult.data ?? [];

            const matchedCustomer =
              customers.find(
                (item: Customer) =>
                  item.user?.email?.toLowerCase() ===
                  user.email?.toLowerCase()
              );

            if (
              matchedCustomer &&
              !cancelled
            ) {
              setCustomer(
                matchedCustomer
              );

              setCustomerName(
                `${matchedCustomer.firstName} ${matchedCustomer.lastName}`.trim()
              );

              setCustomerMobile(
                matchedCustomer.user
                  ?.mobile || ""
              );

              setCustomerEmail(
                matchedCustomer.user
                  ?.email ||
                  user.email ||
                  ""
              );
            }
          }
        }

        /*
         * ========================================================
         * 3. SELECTED MARKETPLACE LISTING
         * ========================================================
         */

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

        if (searchDate) {
          params.set(
            "date",
            searchDate
          );
        }

        if (searchTime) {
          params.set(
            "time",
            searchTime
          );
        }

        if (category) {
          params.set(
            "category",
            category
          );
        }

        const listingResponse =
          await fetch(
            `/api/marketplace/search?${params.toString()}`,
            {
              cache: "no-store",
            }
          );

        const listingResult =
          await listingResponse.json();

        if (
          !listingResponse.ok ||
          !listingResult.success
        ) {
          throw new Error(
            listingResult.message ||
              "Unable to load selected vehicle."
          );
        }

        const found =
          listingResult.data?.listings?.find(
            (item: Listing) =>
              item.id === listingId
          );

        if (!found) {
          throw new Error(
            "Selected vehicle is no longer available."
          );
        }

        if (!cancelled) {
          setListing(found);

          if (!pickup) {
            setPickup(
              found.location.city
            );
          }

          if (
            searchDate &&
            searchTime
          ) {
            setPickupDateTime(
              `${searchDate}T${searchTime}`
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load booking information."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBookingData();

    return () => {
      cancelled = true;
    };
  }, [
    listingId,
    serviceType,
    tripType,
    pickupCity,
    dropCity,
    searchDate,
    searchTime,
    category,
  ]);

  /*
   * ============================================================
   * CREATE BOOKING
   * ============================================================
   */

  async function createBooking() {
    if (!listing) {
      setMessage(
        "Selected vehicle is missing."
      );
      return;
    }

    if (!customer?.id) {
      setMessage(
        "Customer profile could not be found. Please login with a registered RideGrid customer account."
      );
      return;
    }

    if (!pickup.trim()) {
      setMessage(
        "Pickup location is required."
      );
      return;
    }

    if (!drop.trim()) {
      setMessage(
        "Drop location is required."
      );
      return;
    }

    if (!pickupDateTime) {
      setMessage(
        "Pickup date and time are required."
      );
      return;
    }

    const parsedDate =
      new Date(pickupDateTime);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      setMessage(
        "Pickup date and time are invalid."
      );
      return;
    }

    try {
      setBooking(true);
      setMessage("");
      setSuccessMessage("");

      const response =
        await fetch(
          "/api/bookings/create",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              customerId:
                customer.id,

              vendorId:
                listing.vendor?.id,

              vehicleId:
                listing.id,

              driverId:
                listing.driver?.id ||
                null,

              pickupLocation:
                pickup.trim(),

              dropLocation:
                drop.trim(),

              pickupDateTime:
                parsedDate.toISOString(),

              estimatedFare:
                listing.pricing.baseFare,
            }),
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
            "Booking creation failed."
        );
      }

      /*
       * ========================================================
       * BOOKING CREATED
       *
       * Do not redirect to the old bookings page.
       * Marketplace bookings have their own confirmation
       * experience.
       * ========================================================
       */

      const bookingId =
        result.data?.id || "";

      const bookingNumber =
        result.data?.bookingNumber ||
        "";

      if (!bookingId) {
        throw new Error(
          "Booking was created but no booking ID was returned."
        );
      }

      setSuccessMessage(
        "Your booking has been created successfully."
      );

      /*
       * Short success state gives the customer
       * immediate feedback before navigation.
       */

      setTimeout(() => {
        const confirmationParams =
          new URLSearchParams({
            bookingId,
          });

        if (bookingNumber) {
          confirmationParams.set(
            "bookingNumber",
            bookingNumber
          );
        }

        router.push(
          `/marketplace/booking/confirmation?${confirmationParams.toString()}`
        );
      }, 700);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Booking creation failed."
      );
    } finally {
      setBooking(false);
    }
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-2xl border bg-white p-16 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-5 font-semibold text-slate-700">
            Preparing your booking...
          </p>

          <p className="mt-1 text-sm text-slate-400">
            Loading customer and vehicle details.
          </p>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * VEHICLE NOT AVAILABLE
   * ============================================================
   */

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border bg-white p-12 text-center shadow-sm">
          <div className="text-4xl">
            🚗
          </div>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Vehicle unavailable
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {message ||
              "The selected marketplace listing is no longer available."}
          </p>

          <button
            type="button"
            onClick={() =>
              router.push(
                "/marketplace"
              )
            }
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Back to Marketplace
          </button>
        </div>
      </main>
    );
  }

  const baseFare =
    Number(
      listing.pricing.baseFare
    );

  const serviceCharge = 0;

  const tax = 0;

  const totalFare =
    baseFare +
    serviceCharge +
    tax;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to Listings
          </button>

          <div className="mt-4">
            <div className="flex flex-wrap gap-2">
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
            </div>

            <h1 className="mt-3 text-3xl font-bold text-slate-900">
              Review & Confirm Booking
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Review your journey, customer,
              vehicle and fare before confirming.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="space-y-6">
            {/* Journey */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                    Step 1
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Journey Details
                  </h2>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  {formatTripType(
                    tripType
                  )}
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Pickup Location
                  </label>

                  <input
                    value={pickup}
                    onChange={(event) =>
                      setPickup(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                    placeholder="Enter pickup location"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Drop Location
                  </label>

                  <input
                    value={drop}
                    onChange={(event) =>
                      setDrop(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                    placeholder="Enter drop location"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Pickup Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={
                      pickupDateTime
                    }
                    onChange={(event) =>
                      setPickupDateTime(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border bg-white px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <JourneyInfo
                  label="Pickup"
                  value={
                    pickup ||
                    "Not selected"
                  }
                />

                <JourneyInfo
                  label="Drop"
                  value={
                    drop ||
                    "Not selected"
                  }
                />

                <JourneyInfo
                  label="Date"
                  value={
                    searchDate
                      ? formatDate(
                          searchDate
                        )
                      : "Selected above"
                  }
                />
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Step 2
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Customer Details
              </h2>

              {customer ? (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <CustomerInfo
                    label="Customer"
                    value={
                      customerName ||
                      `${customer.firstName} ${customer.lastName}`
                    }
                  />

                  <CustomerInfo
                    label="Mobile"
                    value={
                      customerMobile ||
                      "Not available"
                    }
                  />

                  <CustomerInfo
                    label="Email"
                    value={
                      customerEmail ||
                      "Not available"
                    }
                  />
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-semibold text-amber-800">
                    Customer profile not found.
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    A registered RideGrid customer
                    account is required to complete
                    this booking.
                  </p>
                </div>
              )}
            </section>

            {/* Vehicle */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Step 3
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Selected Vehicle
              </h2>

              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-bold text-slate-900">
                        {
                          listing.vehicle
                            .make
                        }{" "}
                        {
                          listing.vehicle
                            .model
                        }
                      </h3>

                      {listing.marketplace
                        .verified && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {listing.vehicle
                        .variant ||
                        "Standard Variant"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3 text-center shadow-sm">
                    <div className="text-xs text-slate-400">
                      Rating
                    </div>

                    <div className="mt-1 font-bold text-slate-900">
                      ★{" "}
                      {Number(
                        listing.marketplace
                          .rating
                      ).toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <VehicleInfo
                    label="Category"
                    value={formatCategory(
                      listing.vehicle
                        .category
                    )}
                  />

                  <VehicleInfo
                    label="Seats"
                    value={`${listing.vehicle.seatingCapacity}`}
                  />

                  <VehicleInfo
                    label="Fuel"
                    value={formatCategory(
                      listing.vehicle
                        .fuelType
                    )}
                  />

                  <VehicleInfo
                    label="Transmission"
                    value={formatCategory(
                      listing.vehicle
                        .transmission
                    )}
                  />
                </div>

                <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Vendor
                    </p>

                    <p className="mt-1 font-bold text-slate-800">
                      {listing.vendor
                        ?.companyName ||
                        "RideGrid Partner"}
                    </p>

                    {listing.vendor
                      ?.name && (
                      <p className="text-sm text-slate-500">
                        {
                          listing.vendor
                            .name
                        }
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Driver
                    </p>

                    <p className="mt-1 font-bold text-slate-800">
                      {listing.driver
                        ?.name ||
                        "Assigned by Vendor"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Fare */}
          <aside>
            <div className="sticky top-6 rounded-2xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
                Step 4
              </p>

              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Fare Summary
              </h2>

              <div className="mt-6 space-y-4">
                <FareRow
                  label="Base Fare"
                  value={formatCurrency(
                    baseFare
                  )}
                />

                <FareRow
                  label="Service Charges"
                  value={formatCurrency(
                    serviceCharge
                  )}
                />

                <FareRow
                  label="Taxes"
                  value={formatCurrency(
                    tax
                  )}
                />

                <div className="border-t pt-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        Total Estimated Fare
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Final fare may include
                        applicable journey extras.
                      </p>
                    </div>

                    <div className="text-3xl font-black text-slate-900">
                      {formatCurrency(
                        totalFare
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {message && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {message}
                </div>
              )}

              {successMessage && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  {successMessage}
                </div>
              )}

              <button
                type="button"
                onClick={
                  createBooking
                }
                disabled={
                  booking ||
                  !customer?.id
                }
                className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {booking
                  ? "Creating Booking..."
                  : "Confirm & Book Ride"}
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                By confirming, the selected
                vehicle and journey details will
                be submitted to RideGrid for
                booking.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function JourneyInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function CustomerInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function VehicleInfo({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function FareRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}