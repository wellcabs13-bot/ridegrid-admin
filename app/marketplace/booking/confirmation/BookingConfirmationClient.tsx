"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type Booking = {
  id: string;
  bookingNumber: string;
  customerId: string;
  vendorId: string;
  vehicleId: string;
  driverId?: string | null;

  pickupLocation: string;
  dropLocation: string;
  pickupDateTime: string;

  status: string;

  estimatedFare: number | string;
  baseFare?: number | string | null;
  taxAmount?: number | string | null;
  discountAmount?: number | string | null;
  extraCharges?: number | string | null;
  finalFare?: number | string | null;

  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    user?: {
      name?: string;
      email?: string;
      mobile?: string | null;
    };
  };

  vendor?: {
    id: string;
    companyName: string;
    user?: {
      name?: string;
      email?: string;
      mobile?: string | null;
    };
  };

  vehicle?: {
    id: string;
    make: string;
    model: string;
    variant?: string | null;
    category: string;
    fuelType: string;
    transmission: string;
    seatingCapacity: number;
    luggageCapacity?: number | null;
    year?: number | null;
    color?: string | null;
  };

  driver?: {
    id: string;
    user?: {
      name?: string;
      mobile?: string | null;
    };
  } | null;

  createdAt: string;
};

function formatCurrency(
  value: number | string | null | undefined
) {
  const amount = Number(value ?? 0);

  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCategory(
  value?: string | null
) {
  if (!value) {
    return "—";
  }

  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "PENDING":
      return "Booking Pending";

    case "CONFIRMED":
      return "Booking Confirmed";

    case "DRIVER_ASSIGNED":
      return "Driver Assigned";

    case "TRIP_STARTED":
      return "Trip Started";

    case "TRIP_COMPLETED":
      return "Trip Completed";

    case "CANCELLED":
      return "Cancelled";

    default:
      return formatCategory(status);
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "CONFIRMED":
    case "DRIVER_ASSIGNED":
    case "TRIP_COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "TRIP_STARTED":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "CANCELLED":
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

export default function BookingConfirmationPage() {
  return (
    <Suspense
      fallback={
        <ConfirmationLoading />
      }
    >
      <BookingConfirmationContent />
    </Suspense>
  );
}

function BookingConfirmationContent() {
  const router = useRouter();

  const searchParams =
    useSearchParams();

  const bookingId =
    searchParams.get("bookingId");

  const bookingNumberFromQuery =
    searchParams.get("bookingNumber");

  const [booking, setBooking] =
    useState<Booking | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBooking() {
      try {
        setLoading(true);
        setError("");

        if (!bookingId) {
          throw new Error(
            "Booking ID is missing."
          );
        }

        const response =
          await fetch(
            `/api/bookings/${encodeURIComponent(
              bookingId
            )}`,
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
              "Unable to load booking details."
          );
        }

        if (!cancelled) {
          setBooking(
            result.data ?? null
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load booking details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBooking();

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (loading) {
    return <ConfirmationLoading />;
  }

  if (error || !booking) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6">
          <div className="w-full rounded-3xl border bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl text-red-600">
              !
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Booking confirmation unavailable
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">
              {error ||
                "We could not retrieve this booking."}
            </p>

            {bookingNumberFromQuery && (
              <p className="mt-4 text-sm font-semibold text-slate-700">
                Booking Reference:{" "}
                <span className="text-blue-600">
                  {bookingNumberFromQuery}
                </span>
              </p>
            )}

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/marketplace"
                  )
                }
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Back to Marketplace
              </button>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/bookings"
                  )
                }
                className="rounded-xl border bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                View Bookings
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const customerName =
    booking.customer
      ? `${booking.customer.firstName} ${booking.customer.lastName}`.trim()
      : "Customer";

  const vehicleName =
    booking.vehicle
      ? `${booking.vehicle.make} ${booking.vehicle.model}`
      : "Vehicle";

  const totalFare =
    booking.finalFare ??
    booking.estimatedFare;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/marketplace"
              )
            }
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            ← Back to Marketplace
          </button>
        </div>
      </header>

      <section className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-600">
                ✓
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">
                  RideGrid Booking
                </p>

                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">
                  Booking Created Successfully
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  Your vehicle selection has been submitted
                  successfully. Keep your booking number for
                  future reference.
                </p>
              </div>
            </div>

            <div
              className={`rounded-2xl border px-5 py-4 ${getStatusClasses(
                booking.status
              )}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                Current Status
              </p>

              <p className="mt-1 text-lg font-black">
                {getStatusLabel(
                  booking.status
                )}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-slate-900 p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Booking Number
                </p>

                <p className="mt-2 break-all text-2xl font-black tracking-wide">
                  {booking.bookingNumber ||
                    bookingNumberFromQuery ||
                    booking.id}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-400">
                  Created
                </p>

                <p className="mt-1 font-semibold text-white">
                  {formatDateTime(
                    booking.createdAt
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <SectionTitle
                eyebrow="Journey"
                title="Trip Details"
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <InfoBox
                  label="Pickup"
                  value={
                    booking.pickupLocation
                  }
                />

                <InfoBox
                  label="Drop"
                  value={
                    booking.dropLocation
                  }
                />

                <InfoBox
                  label="Pickup Date & Time"
                  value={formatDateTime(
                    booking.pickupDateTime
                  )}
                />

                <InfoBox
                  label="Booking Status"
                  value={getStatusLabel(
                    booking.status
                  )}
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <SectionTitle
                eyebrow="Selected Ride"
                title="Vehicle Details"
              />

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {vehicleName}
                    </h2>

                    {booking.vehicle
                      ?.variant && (
                      <p className="mt-1 text-sm text-slate-500">
                        {
                          booking.vehicle
                            .variant
                        }
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {booking.vehicle
                        ?.category && (
                        <Badge>
                          {formatCategory(
                            booking.vehicle
                              .category
                          )}
                        </Badge>
                      )}

                      {booking.vehicle
                        ?.fuelType && (
                        <Badge>
                          {formatCategory(
                            booking.vehicle
                              .fuelType
                          )}
                        </Badge>
                      )}

                      {booking.vehicle
                        ?.transmission && (
                        <Badge>
                          {formatCategory(
                            booking.vehicle
                              .transmission
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white px-5 py-4 text-center">
                    <p className="text-xs text-slate-400">
                      Seats
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {booking.vehicle
                        ?.seatingCapacity ??
                        "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <InfoBox
                    label="Year"
                    value={
                      booking.vehicle
                        ?.year
                        ? String(
                            booking.vehicle
                              .year
                          )
                        : "—"
                    }
                  />

                  <InfoBox
                    label="Color"
                    value={
                      booking.vehicle
                        ?.color ||
                      "—"
                    }
                  />

                  <InfoBox
                    label="Luggage"
                    value={
                      booking.vehicle
                        ?.luggageCapacity
                        ? `${booking.vehicle.luggageCapacity} bags`
                        : "—"
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <SectionTitle
                eyebrow="Ride Partner"
                title="Vendor & Driver"
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <PartnerCard
                  title="Vendor"
                  name={
                    booking.vendor
                      ?.companyName ||
                    "RideGrid Partner"
                  }
                  contact={
                    booking.vendor
                      ?.user?.mobile ||
                    booking.vendor
                      ?.user?.email ||
                    "Contact details available after confirmation"
                  }
                />

                <PartnerCard
                  title="Driver"
                  name={
                    booking.driver
                      ?.user?.name ||
                    "Driver assignment pending"
                  }
                  contact={
                    booking.driver
                      ?.user?.mobile ||
                    "Driver contact will be available after assignment"
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <SectionTitle
                eyebrow="Passenger"
                title="Customer Details"
              />

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <InfoBox
                  label="Customer"
                  value={customerName}
                />

                <InfoBox
                  label="Mobile"
                  value={
                    booking.customer
                      ?.user?.mobile ||
                    "—"
                  }
                />

                <InfoBox
                  label="Email"
                  value={
                    booking.customer
                      ?.user?.email ||
                    "—"
                  }
                />
              </div>
            </section>
          </div>

          <aside>
            <div className="sticky top-6 space-y-5">
              <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <SectionTitle
                  eyebrow="Payment"
                  title="Fare Summary"
                />

                <div className="mt-6 space-y-4">
                  <FareRow
                    label="Estimated Fare"
                    value={formatCurrency(
                      booking.estimatedFare
                    )}
                  />

                  {booking.baseFare !==
                    null &&
                    booking.baseFare !==
                      undefined && (
                      <FareRow
                        label="Base Fare"
                        value={formatCurrency(
                          booking.baseFare
                        )}
                      />
                    )}

                  {Number(
                    booking.discountAmount ??
                      0
                  ) > 0 && (
                    <FareRow
                      label="Discount"
                      value={`-${formatCurrency(
                        booking.discountAmount
                      )}`}
                    />
                  )}

                  {Number(
                    booking.taxAmount ??
                      0
                  ) > 0 && (
                    <FareRow
                      label="Taxes"
                      value={formatCurrency(
                        booking.taxAmount
                      )}
                    />
                  )}

                  {Number(
                    booking.extraCharges ??
                      0
                  ) > 0 && (
                    <FareRow
                      label="Extra Charges"
                      value={formatCurrency(
                        booking.extraCharges
                      )}
                    />
                  )}

                  <div className="border-t pt-5">
                    <p className="text-sm font-semibold text-slate-500">
                      Total Fare
                    </p>

                    <p className="mt-1 text-3xl font-black text-slate-900">
                      {formatCurrency(
                        totalFare
                      )}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border bg-white p-6 shadow-sm">
                <p className="text-sm font-bold text-slate-900">
                  What&apos;s next?
                </p>

                <div className="mt-4 space-y-3">
                  <NextStep
                    number="1"
                    text="Your booking remains in the RideGrid booking workflow."
                  />

                  <NextStep
                    number="2"
                    text="The vendor and driver will receive the booking request."
                  />

                  <NextStep
                    number="3"
                    text="You can track the booking from your bookings section."
                  />
                </div>
              </section>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/bookings?id=${encodeURIComponent(
                        booking.id
                      )}`
                    )
                  }
                  className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  View Booking
                </button>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/marketplace"
                    )
                  }
                  className="w-full rounded-xl border bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Search Another Ride
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            RideGrid
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Your journey. Your choice. One marketplace.
          </p>
        </div>
      </footer>
    </main>
  );
}

function ConfirmationLoading() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <div className="w-full rounded-3xl border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <h1 className="mt-6 text-xl font-bold text-slate-900">
            Loading booking confirmation
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please wait while we retrieve your booking.
          </p>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-bold text-slate-900">
        {title}
      </h2>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-slate-600">
      {children}
    </span>
  );
}

function PartnerCard({
  title,
  name,
  contact,
}: {
  title: string;
  name: string;
  contact: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-lg font-black text-slate-900">
        {name}
      </p>

      <p className="mt-1 break-words text-sm text-slate-500">
        {contact}
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
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="font-bold text-slate-800">
        {value}
      </span>
    </div>
  );
}

function NextStep({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-600">
        {number}
      </div>

      <p className="text-sm leading-5 text-slate-500">
        {text}
      </p>
    </div>
  );
}