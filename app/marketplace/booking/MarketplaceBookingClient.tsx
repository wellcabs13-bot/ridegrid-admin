"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
  location?: { city?: string | null };
  pricing: {
    pricingPackageId?: string;
    packageName?: string | null;
    packageType?: string | null;
    baseFare: number;
    includedHours?: number | null;
    includedKm?: number | null;
    pricePerKm?: number | null;
    extraHourRate?: number | null;
    driverAllowance?: number | null;
    nightCharge?: number | null;
    waitingCharge?: number | null;
    tollCharge?: number | null;
    parkingCharge?: number | null;
    otherCharges?: number | null;
    airportName?: string | null;
    transferDirection?: string | null;
  };
  marketplace?: {
    rating?: number;
    totalTrips?: number;
    verified?: boolean;
    status?: string;
    available?: boolean;
  };
  vendor?: {
    id: string;
    companyName: string;
    name?: string | null;
    mobile?: string | null;
  } | null;
  driver?: {
    id: string;
    name: string;
    mobile?: string | null;
  } | null;
};

type Coupon = {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  couponType: "PERCENTAGE" | "FLAT";
  couponScope: "GLOBAL" | "VENDOR" | "CITY" | "CORPORATE";
  discountValue: number;
  minimumBooking?: number | null;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isFirstRideOnly: boolean;
};

function title(value: string) {
  return value
    ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "â€”";
}

function currency(value: number | null | undefined) {
  return `â‚¹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
}

function tripLabel(value: string) {
  if (value === "ROUNDTRIP") return "Round Trip";
  if (value === "ONEWAY") return "One Way";
  return title(value);
}

function serviceLabel(value: string) {
  if (value === "OUTSTATION") return "Outstation";
  if (value === "LOCAL") return "Local";
  if (value === "AIRPORT") return "Airport";
  return title(value);
}

export default function MarketplaceBookingClient() {
  const router = useRouter();
  const params = useSearchParams();

  const listingId = params.get("listingId") || "";
  const serviceType = params.get("serviceType") || "";
  const tripType = params.get("tripType") || "";
  const pickupCity = params.get("pickupCity") || "";
  const dropCity = params.get("dropCity") || "";
  const date = params.get("date") || "";
  const time = params.get("time") || "";
  const category = params.get("category") || "";
  const packageName = params.get("packageName") || "";
  const airport = params.get("airport") || "";
  const airportDirection = params.get("airportDirection") || "";
  const airportSlab = params.get("airportSlab") || "";
  const corporateId = params.get("corporateId") || "";
  const corporateName = params.get("corporateName") || "";

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [specialRequest, setSpecialRequest] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [readyMessage, setReadyMessage] = useState("");

  const [pickupCoordinates, setPickupCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [dropCoordinates, setDropCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [selectedCouponId, setSelectedCouponId] = useState("");
  const [couponMessage, setCouponMessage] = useState("");


  useEffect(() => {
    let cancelled = false;

    async function loadListing() {
      try {
        setLoading(true);
        setError("");

        if (!listingId) {
          throw new Error("Selected vehicle listing is missing.");
        }

        const search = new URLSearchParams();
        search.set("page", "1");
        search.set("limit", "100");
        search.set("serviceType", serviceType);
        if (tripType) search.set("tripType", tripType);
        if (pickupCity) search.set("pickupCity", pickupCity);
        if (dropCity) search.set("dropCity", dropCity);
        if (date) search.set("date", date);
        if (time) search.set("time", time);
        if (category) search.set("category", category);
        if (packageName) search.set("packageName", packageName);
        if (airport) search.set("airport", airport);
        if (airportDirection) search.set("airportDirection", airportDirection);
        if (airportSlab) search.set("airportSlab", airportSlab);

        const response = await fetch(`/api/marketplace/search?${search.toString()}`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load the selected vehicle.");
        }

        const found = result.data?.listings?.find(
          (item: Listing) => item.id === listingId
        );

        if (!found) {
          throw new Error("Selected vehicle is no longer available for this search.");
        }

        if (!cancelled) {
          setListing(found);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load booking.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadListing();

    return () => {
      cancelled = true;
    };
  }, [
    listingId,
    serviceType,
    tripType,
    pickupCity,
    dropCity,
    date,
    time,
    category,
    packageName,
    airport,
    airportDirection,
    airportSlab,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadCoupons() {
      if (!listing?.vendor?.id) return;

      try {
        setCouponsLoading(true);
        setCouponMessage("");

        const couponParams = new URLSearchParams();
        couponParams.set("vendorId", listing.vendor.id);
        couponParams.set("city", pickupCity || listing.location?.city || "");

        const response = await fetch(
          `/api/marketplace/coupons?${couponParams.toString()}`,
          { cache: "no-store" }
        );
        const result = await response.json();

        if (!cancelled && response.ok && result.success) {
          setCoupons(result.data || []);
        }
      } catch {
        if (!cancelled) {
          setCouponMessage("Unable to load current offers.");
        }
      } finally {
        if (!cancelled) setCouponsLoading(false);
      }
    }

    loadCoupons();

    return () => {
      cancelled = true;
    };
  }, [listing?.vendor?.id, pickupCity]);

  const total = useMemo(
    () => Number(listing?.pricing.baseFare || 0),
    [listing]
  );

  const selectedCoupon = useMemo(
    () => coupons.find((coupon) => coupon.id === selectedCouponId) || null,
    [coupons, selectedCouponId]
  );

  const discountAmount = useMemo(() => {
    if (!selectedCoupon) return 0;

    const fare = Number(listing?.pricing.baseFare || 0);
    if (selectedCoupon.minimumBooking != null && fare < Number(selectedCoupon.minimumBooking)) {
      return 0;
    }

    const raw =
      selectedCoupon.couponType === "PERCENTAGE"
        ? fare * (Number(selectedCoupon.discountValue) / 100)
        : Number(selectedCoupon.discountValue);

    const capped =
      selectedCoupon.maximumDiscount != null
        ? Math.min(raw, Number(selectedCoupon.maximumDiscount))
        : raw;

    return Math.max(0, Math.min(capped, fare));
  }, [listing, selectedCoupon]);

  const finalFare = useMemo(
    () => Math.max(0, Number(total) - Number(discountAmount)),
    [total, discountAmount]
  );

  function applyCoupon(id: string) {
    setCouponMessage("");

    const coupon = coupons.find((item) => item.id === id);
    if (!coupon) {
      setSelectedCouponId("");
      return;
    }

    const fare = Number(listing?.pricing.baseFare || 0);

    if (coupon.minimumBooking != null && fare < Number(coupon.minimumBooking)) {
      setSelectedCouponId("");
      setCouponMessage(
        `This offer requires a minimum booking value of ${currency(Number(coupon.minimumBooking))}.`
      );
      return;
    }

    setSelectedCouponId(coupon.id);
    setCouponCode(coupon.code);
    setCouponMessage(`${coupon.code} applied successfully.`);
  }

  function applyCouponCode() {
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      setSelectedCouponId("");
      setCouponMessage("Enter a coupon code first.");
      return;
    }

    const coupon = coupons.find((item) => item.code.toUpperCase() === code);

    if (!coupon) {
      setSelectedCouponId("");
      setCouponMessage("This coupon is not currently available for this booking.");
      return;
    }

    applyCoupon(coupon.id);
  }

  function continueToPaymentPreparation() {
    setReadyMessage("");

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required.");
      return;
    }
    if (!mobile.trim()) {
      setError("Mobile number is required.");
      return;
    }
    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!pickupAddress.trim()) {
      setError("Pickup address is required.");
      return;
    }
    if (!pickupCoordinates) {
      setError("Please select a pickup location from the suggestions.");
      return;
    }
    if (!dropAddress.trim() && serviceType !== "LOCAL") {
      setError("Drop location is required.");
      return;
    }
    if (dropAddress.trim() && !dropCoordinates) {
      setError("Please select a drop / destination location from the suggestions.");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the booking terms to continue.");
      return;
    }

    const bookingDraft = {
      listingId,
      serviceType,
      tripType,
      pickupCity,
      dropCity,
      date,
      time,
      category,
      packageName,
      airport,
      corporateId: corporateId || null,
      corporateName: corporateName || null,
      airportDirection,
      airportSlab,
      customer: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        pickupAddress: pickupAddress.trim(),
        dropAddress: dropAddress.trim(),
        specialRequest: specialRequest.trim(),
        pickupCoordinates,
        dropCoordinates,
      },
      vehicle: listing
        ? {
            make: listing.vehicle.make,
            model: listing.vehicle.model,
            variant: listing.vehicle.variant,
            year: listing.vehicle.year,
            category: listing.vehicle.category,
            seatingCapacity: listing.vehicle.seatingCapacity,
          }
        : null,
      pricing: listing?.pricing ? { ...listing.pricing, pricingPackageId: listing.pricing.pricingPackageId || null } : null,
      coupon: selectedCoupon
        ? {
            id: selectedCoupon.id,
            code: selectedCoupon.code,
            title: selectedCoupon.title,
            couponType: selectedCoupon.couponType,
            discountValue: Number(selectedCoupon.discountValue),
            discountAmount: Number(discountAmount),
          }
        : null,
      totalFare: Number(finalFare),
      originalFare: Number(total),
      discountAmount: Number(discountAmount),
    };

    sessionStorage.setItem("ridegrid_marketplace_booking_draft", JSON.stringify(bookingDraft));
    setReadyMessage("Booking details, exact locations and offer are ready.");
    return true;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <h1 className="mt-5 text-xl font-bold text-slate-900">Loading booking</h1>
          <p className="mt-2 text-sm text-slate-500">Preparing your selected vehicle.</p>
        </div>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl rounded-3xl border bg-white p-12 text-center shadow-sm">
          <div className="text-4xl">ðŸš—</div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Vehicle unavailable</h1>
          <p className="mt-2 text-sm text-red-600">{error || "Selected listing is unavailable."}</p>
          <button
            onClick={() => router.back()}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white"
          >
            Back to Listings
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <button
            onClick={() => router.back()}
            className="text-sm font-bold text-blue-600"
          >
            â† Back to Listings
          </button>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-600">
                RideGrid Booking
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900">
                Customer Details
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter your details and review the selected vehicle before payment.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">
                {serviceLabel(serviceType)}
              </span>
              {tripType && (
                <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                  {tripLabel(tripType)}
                </span>
              )}
              {date && (
                <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                  {date}
                </span>
              )}
              {time && (
                <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">
                  {time}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Step 1</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Customer Information</h2>
              <p className="mt-1 text-sm text-slate-500">
                These details will be used for your booking and communication.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="First Name *" value={firstName} onChange={setFirstName} placeholder="Enter first name" />
                <Field label="Last Name *" value={lastName} onChange={setLastName} placeholder="Enter last name" />
                <Field label="Mobile Number *" value={mobile} onChange={setMobile} placeholder="Enter mobile number" type="tel" />
                <Field label="Email Address *" value={email} onChange={setEmail} placeholder="Enter email address" type="email" />
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Step 2</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Journey Details</h2>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <LocationAutocomplete
                  label="Pickup Address *"
                  value={pickupAddress}
                  coordinates={pickupCoordinates}
                  placeholder="Search building, hotel, society or landmark"
                  onChange={(value, coordinates) => {
                    setPickupAddress(value);
                    setPickupCoordinates(coordinates);
                    setError("");
                  }}
                />
                <LocationAutocomplete
                  label={serviceType === "LOCAL" ? "Drop / Destination" : "Drop Address *"}
                  value={dropAddress}
                  coordinates={dropCoordinates}
                  placeholder="Search destination, building, hotel or landmark"
                  onChange={(value, coordinates) => {
                    setDropAddress(value);
                    setDropCoordinates(coordinates);
                    setError("");
                  }}
                />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-bold text-slate-700">Special Request</label>
                <textarea
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  rows={4}
                  placeholder="Any special request for your journey?"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Step 3</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Selected Vehicle</h2>

              <div className="mt-6 rounded-2xl border bg-slate-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-black text-slate-900">
                        {listing.vehicle.make} {listing.vehicle.model}
                      </h3>
                      {listing.marketplace?.verified && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                          âœ“ Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {listing.vehicle.variant || "Standard Variant"} â€¢ {title(listing.vehicle.category)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white px-5 py-3 text-center shadow-sm">
                    <p className="text-xs text-slate-400">Vehicle Rating</p>
                    <p className="mt-1 text-lg font-black text-slate-900">
                      â˜… {Number(listing.marketplace?.rating || 0).toFixed(1)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <Info label="Year" value={listing.vehicle.year ? String(listing.vehicle.year) : "â€”"} />
                  <Info label="Seats" value={String(listing.vehicle.seatingCapacity)} />
                  <Info label="Fuel" value={title(listing.vehicle.fuelType)} />
                  <Info label="Transmission" value={title(listing.vehicle.transmission)} />
                  <Info label="Luggage" value={listing.vehicle.luggageCapacity ? String(listing.vehicle.luggageCapacity) : "â€”"} />
                  <Info label="Color" value={listing.vehicle.color || "â€”"} />
                </div>

                <div className="mt-5 grid gap-4 border-t pt-5 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Vendor</p>
                    <p className="mt-1 font-black text-slate-800">
                      {listing.vendor?.companyName || "RideGrid Partner"} âœ“
                    </p>
                    {listing.vendor?.name && (
                      <p className="text-sm text-slate-500">{listing.vendor.name}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">Assigned Driver</p>
                    <p className="mt-1 font-black text-slate-800">
                      {listing.driver?.name || "Assigned Driver"} âœ“
                    </p>
                    <p className="text-sm text-emerald-600">Active & assigned</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Step 4</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Offer Coupon</h2>
              <p className="mt-1 text-sm text-slate-500">
                Apply an active RideGrid offer available for this booking.
              </p>

              <div className="mt-5 flex flex-col gap-3 md:flex-row">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3.5 font-bold uppercase outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={applyCouponCode}
                  className="rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-black text-white hover:bg-slate-800"
                >
                  Apply Coupon
                </button>
              </div>

              <div className="mt-4">
                {couponsLoading ? (
                  <p className="text-sm text-slate-400">Checking current offers...</p>
                ) : coupons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-slate-50 p-4 text-sm text-slate-500">
                    No active coupon offers are available for this booking right now.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {coupons.map((coupon) => (
                      <button
                        key={coupon.id}
                        type="button"
                        onClick={() => applyCoupon(coupon.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selectedCouponId === coupon.id
                            ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100"
                            : "border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                              {coupon.code}
                            </p>
                            <p className="mt-1 font-black text-slate-900">{coupon.title}</p>
                          </div>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
                            {coupon.couponType === "PERCENTAGE"
                              ? `${Number(coupon.discountValue)}% OFF`
                              : `${currency(Number(coupon.discountValue))} OFF`}
                          </span>
                        </div>
                        {coupon.description && (
                          <p className="mt-2 text-xs text-slate-500">{coupon.description}</p>
                        )}
                        {coupon.minimumBooking != null && (
                          <p className="mt-2 text-xs font-semibold text-slate-500">
                            Min. booking {currency(Number(coupon.minimumBooking))}
                          </p>
                        )}
                        {coupon.isFirstRideOnly && (
                          <p className="mt-2 text-xs font-bold text-amber-600">First ride only</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {couponMessage && (
                <div
                  className={`mt-4 rounded-2xl border p-4 text-sm font-semibold ${
                    selectedCouponId
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-700"
                  }`}
                >
                  {couponMessage}
                </div>
              )}
            </section>

            <section className="rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Step 5</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Booking Terms</h2>

              <label className="mt-5 flex items-start gap-3 rounded-2xl border bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span className="text-sm leading-6 text-slate-600">
                  I confirm that the customer, journey and vehicle details entered above are correct.
                  I agree to RideGrid booking terms and applicable cancellation policies.
                </span>
              </label>
            </section>
          </div>

          <aside>
            <div className="sticky top-6 rounded-3xl border bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600">Booking Summary</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">Review & Continue</h2>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">VEHICLE</p>
                <p className="mt-1 font-black text-slate-900">
                  {listing.vehicle.make} {listing.vehicle.model}
                </p>
                <p className="text-sm text-slate-500">
                  {listing.vehicle.year || "Year not available"} â€¢ {title(listing.vehicle.category)} â€¢ {listing.vehicle.seatingCapacity} Seats
                </p>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-400">SAVED PRICING</p>
                <p className="mt-1 font-black text-slate-900">
                  {listing.pricing.packageName || "Selected Pricing Package"}
                </p>

                {listing.pricing.includedKm != null && (
                  <SummaryRow label="Included KM" value={`${listing.pricing.includedKm} KM`} />
                )}
                {listing.pricing.includedHours != null && (
                  <SummaryRow label="Included Hours" value={`${listing.pricing.includedHours} Hrs`} />
                )}
                {listing.pricing.pricePerKm != null && (
                  <SummaryRow label="Extra KM" value={`${currency(listing.pricing.pricePerKm)}/KM`} />
                )}
                {listing.pricing.extraHourRate != null && (
                  <SummaryRow label="Extra Hour" value={`${currency(listing.pricing.extraHourRate)}/Hr`} />
                )}
                {listing.pricing.driverAllowance != null && (
                  <SummaryRow label="Driver Allowance" value={currency(listing.pricing.driverAllowance)} />
                )}
                {listing.pricing.nightCharge != null && (
                  <SummaryRow label="Night Charge" value={currency(listing.pricing.nightCharge)} />
                )}
              </div>

              {(airport || listing.pricing.airportName || listing.pricing.transferDirection || airportSlab) && (
                <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-600">Airport Details</p>
                  {listing.pricing.airportName && <SummaryRow label="Airport" value={listing.pricing.airportName} />}
                  {listing.pricing.transferDirection && <SummaryRow label="Transfer" value={title(listing.pricing.transferDirection)} />}
                  {airportSlab && <SummaryRow label="KM Slab" value={`${airportSlab} KM`} />}
                </div>
              )}

              <div className="mt-6 border-t pt-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-500">Saved Package Fare</p>
                    <p className="mt-1 text-xs text-slate-400">Taken directly from the Marketplace pricing result.</p>
                  </div>
                  <p className="text-3xl font-black text-slate-900">{currency(finalFare)}</p>
                </div>

                {selectedCoupon && discountAmount > 0 && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <SummaryRow label="Original Fare" value={currency(total)} />
                    <SummaryRow
                      label={`Coupon (${selectedCoupon.code})`}
                      value={`âˆ’ ${currency(discountAmount)}`}
                    />
                    <div className="flex items-center justify-between gap-3 pt-2">
                      <span className="font-black text-slate-900">Payable After Discount</span>
                      <span className="text-xl font-black text-emerald-600">{currency(finalFare)}</span>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {readyMessage && (
                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                  {readyMessage}
                </div>
              )}

              <button
                type="button"
                onClick={() => { if (continueToPaymentPreparation()) router.push("/marketplace/payment"); }}
                className="mt-6 w-full rounded-2xl bg-cyan-500 px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
              >
                Continue to Payment
              </button>

              <p className="mt-3 text-center text-xs text-slate-400">
                Your selected vehicle and saved pricing are retained for the next step.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

type LocationSuggestion = {
  placeId: string;
  displayName: string;
  shortName: string;
  lat: number;
  lng: number;
};

function LocationAutocomplete({
  label,
  value,
  coordinates,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  coordinates: { lat: number; lng: number } | null;
  placeholder: string;
  onChange: (value: string, coordinates: { lat: number; lng: number } | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();

    if (coordinates || trimmed.length < 3) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const response = await fetch(
          `/api/marketplace/location-search?q=${encodeURIComponent(trimmed)}`,
          { cache: "no-store", signal: controller.signal }
        );
        const result = await response.json();

        if (!controller.signal.aborted && response.ok && result.success) {
          setSuggestions(result.data || []);
          setOpen(true);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, coordinates]);

  function handleChange(nextValue: string) {
    setQuery(nextValue);
    setOpen(true);
    onChange(nextValue, null);
  }

  function selectSuggestion(item: LocationSuggestion) {
    setQuery(item.displayName);
    setSuggestions([]);
    setOpen(false);
    onChange(item.displayName, { lat: item.lat, lng: item.lng });
  }

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
      <div className={`flex items-center rounded-2xl border bg-white px-4 py-3.5 ${coordinates ? "border-emerald-300" : "border-slate-200 focus-within:border-blue-500"}`}>
        <span className="mr-2 text-sm text-slate-400">âŒ•</span>
        <input
          type="text"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onFocus={() => {
            if (query.trim().length >= 3 && !coordinates) setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </div>

      {open && query.trim().length >= 3 && !coordinates && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {loadingSuggestions ? (
            <div className="px-3 py-4 text-sm text-slate-400">Searching locations...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-400">No matching locations found.</div>
          ) : (
            suggestions.map((item) => (
              <button
                key={item.placeId}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectSuggestion(item)}
                className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
              >
                <p className="font-bold text-slate-800">{item.shortName}</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.displayName}</p>
              </button>
            ))
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-slate-400">
        {coordinates
          ? "Location selected. You can edit it to search again."
          : "Type a building, hotel, society or landmark and select the correct suggestion."}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500"
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-800">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}




