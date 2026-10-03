"use client";
import { FareDetails, FareDetailsValue } from "@/components/pricing/FareDetails";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarDays, CarFront, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, Cog, Fuel, Luggage, MapPin, Palette, Plane, ShieldCheck, SlidersHorizontal, Star, Users, Zap } from "lucide-react";
import r from "./MarketplaceResults.module.css";

type Listing = {
  id: string;
  vehicle: {
    id?: string;
    registrationNumber?: string | null;
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
  location: { city: string };
  pricing: {
    pricingPackageId?: string;
    pricingRuleId?: string;
    pricingType?: string;
    tripType?: string | null;
    packageType?: string | null;
    packageName?: string | null;
    city?: string | null;
    fromCity?: string | null;
    toCity?: string | null;
    baseFare: number;
    finalPayable: number;
    quote: FareDetailsValue;
    includedHours?: number | null;
    includedKm?: number | null;
    includedKmPerDay?: number | null;
    extraKmRate?: number | null;
    extraHourRate?: number | null;
    driverAllowance?: number | null;
    driverAllowancePerDay?: number | null;
    tripDays?: number | null;
    nightCharge?: number | null;
    waitingCharge?: number | null;
    tollCharge?: number | null;
    parkingCharge?: number | null;
    otherCharges?: number | null;
    airportName?: string | null;
    transferDirection?: string | null;
    notes?: string | null;
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
    verified?: boolean;
  } | null;
  driver?: {
    id: string;
    verified?: boolean;
    name: string;
  } | null;
  media?: {
    vehiclePhotos?: string[];
    driverPhoto?: string | null;
  };
  ratings?: {
    vehicle?: { average: number | null; count: number };
    vendor?: { average: number | null; count: number };
    driver?: { average: number | null; count: number };
  };
};

type SearchResponse = {
  search?: {
    serviceType?: string | null;
    tripType?: string | null;
    pickupCity?: string | null;
    dropCity?: string | null;
    city?: string | null;
    packageName?: string | null;
    airport?: string | null;
    airportDirection?: string | null;
    airportSlab?: string | null;
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

function title(value?: string | null) {
  if (!value) return "";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function serviceLabel(value: string) {
  switch (value) {
    case "OUTSTATION": return "Outstation";
    case "LOCAL": return "Local";
    case "TOUR_PACKAGE": return "Tour";
    case "AIRPORT":
    case "AIRPORT_TRANSFER": return "Airport";
    default: return title(value) || "Marketplace";
  }
}

function tripLabel(value?: string | null) {
  if (!value) return "";
  return value === "ROUNDTRIP" ? "Round Trip" : value === "ONEWAY" ? "One Way" : title(value);
}

function currency(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function stars(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toFixed(1);
}

function dateLabel(value?: string | null) {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function timeLabel(value?: string | null) {
  const [h, m] = String(value || "").split(":").map(Number);
  if (!value || !Number.isFinite(h) || !Number.isFinite(m)) return value || "";
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function initials(value?: string | null) {
  const parts = String(value || "").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
}

function packageHeadline(listing: Listing) {
  const p = listing.pricing;
  if (p.packageName) return p.packageName;
  if (p.includedHours != null && p.includedKm != null) return `${p.includedHours} Hrs / ${p.includedKm} KM`;
  if (p.includedKm != null) return `${p.includedKm} KM`;
  return title(p.packageType || p.pricingType || "Saved Pricing");
}

function locationLine(listing: Listing) {
  const p = listing.pricing;
  if (p.pricingType === "OUTSTATION" && p.fromCity && p.toCity) {
    return `${p.fromCity} → ${p.toCity}`;
  }
  if (p.pricingType === "AIRPORT") {
    return [p.airportName, p.transferDirection === "PICKUP" ? "Pickup" : p.transferDirection === "DROP" ? "Drop" : ""]
      .filter(Boolean).join(" • ");
  }
  return listing.location.city || p.city || "";
}

function ratingBlock(rating?: { average: number | null; count: number }) {
  if (!rating || rating.average == null) return "No reviews yet";
  return `${Number(rating.average).toFixed(1)} (${rating.count})`;
}

export default function MarketplaceResultsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const corporateId = searchParams.get("corporateId") || "";
  const corporateName = searchParams.get("corporateName") || "";
  

  const serviceType = searchParams.get("serviceType") || "";
  const tripType = searchParams.get("tripType") || "";
  const pickupCity = searchParams.get("pickupCity") || "";
  const dropCity = searchParams.get("dropCity") || "";
  const city = searchParams.get("city") || pickupCity;
  const packageName = searchParams.get("packageName") || "";
  const airport = searchParams.get("airport") || "";
  const airportDirection = searchParams.get("airportDirection") || "";
  const airportSlab = searchParams.get("airportSlab") || "";
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";
  const category = searchParams.get("category") || "";
  const days = searchParams.get("days") || "";
  const endDate = searchParams.get("endDate") || "";
  // Party size from the public search: only cars with enough seats are shown.
  const passengers = Math.max(0, Math.min(20, Number(searchParams.get("passengers")) || 0));
  // Every public and corporate search starts on the one canonical marketplace page.
  const searchHome = "/marketplace";

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("recommended");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("limit", "100");
        for (const [key, value] of Object.entries({
          serviceType, tripType, pickupCity, dropCity, city, packageName,
          airport, airportDirection, airportSlab, date, time, category, days, endDate
        })) {
          if (value) params.set(key, value);
        }

        const response = await fetch(`/api/marketplace/search?${params.toString()}`, { cache: "no-store" });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load marketplace listings.");
        }

        const data = result.data as SearchResponse;
        let nextListings = data.listings ?? [];

        // Enrich the already-resolved real listings with real uploaded photos
        // and published review aggregates. No placeholder/demo images are used.
        const ids = nextListings.map((item) => item.id).filter(Boolean);
        if (ids.length) {
          const mediaResponse = await fetch(
            `/api/marketplace/listing-assets?vehicleIds=${encodeURIComponent(ids.join(","))}`,
            { cache: "no-store" }
          );
          if (mediaResponse.ok) {
            const mediaResult = await mediaResponse.json();
            if (mediaResult.success) {
              const byVehicle = mediaResult.data as Record<string, Listing["media"] & { ratings?: Listing["ratings"] }>;
              nextListings = nextListings.map((item) => ({
                ...item,
                media: byVehicle[item.id] || item.media,
                ratings: byVehicle[item.id]?.ratings || item.ratings,
              }));
            }
          }
        }

        if (!cancelled) setListings(nextListings);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load marketplace listings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [serviceType, tripType, pickupCity, dropCity, city, packageName, airport, airportDirection, airportSlab, date, time, category, days, endDate]);

  const sortedListings = useMemo(() => {
    const items = listings.filter((l) => passengers <= 1 || l.vehicle.seatingCapacity >= passengers);
    if (sortBy === "price_low") return items.sort((a, b) => a.pricing.finalPayable - b.pricing.finalPayable);
    if (sortBy === "price_high") return items.sort((a, b) => b.pricing.finalPayable - a.pricing.finalPayable);
    if (sortBy === "rating") return items.sort((a, b) => (b.ratings?.vehicle?.average ?? b.marketplace.rating ?? 0) - (a.ratings?.vehicle?.average ?? a.marketplace.rating ?? 0));
    if (sortBy === "trips") return items.sort((a, b) => b.marketplace.totalTrips - a.marketplace.totalTrips);
    return items.sort((a, b) => {
      const ra = a.ratings?.vehicle?.average ?? a.marketplace.rating ?? 0;
      const rb = b.ratings?.vehicle?.average ?? b.marketplace.rating ?? 0;
      if (rb !== ra) return rb - ra;
      return b.marketplace.totalTrips - a.marketplace.totalTrips;
    });
  }, [listings, sortBy, passengers]);

  function handleBook(listing: Listing) {
    setSelectedListingId(listing.id);
    const params = new URLSearchParams({
      listingId: listing.id,
      serviceType,
      tripType,
      pickupCity,
      dropCity,
      date,
      time,
    });
    if (category) params.set("category", category);
    if (days) params.set("days", days);
    if (endDate) params.set("endDate", endDate);
    if (packageName) params.set("packageName", packageName);
    if (airport) params.set("airport", airport);
    if (airportDirection) params.set("airportDirection", airportDirection);
    if (airportSlab) params.set("airportSlab", airportSlab);
    if (corporateId) params.set("corporateId", corporateId);
    if (corporateName) params.set("corporateName", corporateName);
    router.push(`/marketplace/booking?${params.toString()}`);
  }

  const isTour = serviceType === "TOUR_PACKAGE";
  const heading = serviceType === "OUTSTATION"
    ? tripLabel(tripType) || "Outstation"
    : isTour
      ? packageName || "Tour"
      : serviceLabel(serviceType);

  const subtitle = serviceType === "OUTSTATION"
    ? `${pickupCity}${dropCity ? ` → ${dropCity}` : ""}`
    : isTour
      ? `Tour${city ? ` · from ${city}` : ""}`
    : serviceType === "AIRPORT"
      ? `${airport || "Airport"}${airportDirection ? ` · ${title(airportDirection)}` : ""}`
      : `Pickup${city ? ` anywhere in ${city}` : ""}`;

  // "Best Price" is shown only on genuinely cheapest listing(s) when there is a comparison.
  const lowestFare = sortedListings.length > 1
    ? Math.min(...sortedListings.map((l) => Number(l.pricing.finalPayable)))
    : null;

  return (
    <main data-rg-light className="min-h-screen bg-[#fafafa] text-neutral-900">
      <header className="border-b border-neutral-200/80 bg-[radial-gradient(900px_240px_at_10%_0%,rgba(225,29,46,0.07),transparent_70%),linear-gradient(180deg,#fff6f5_0%,#fafafa_100%)]">
        <div className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6 sm:py-9">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold tracking-[0.24em] text-[#e11d2e]">
                LIVE MARKETPLACE RESULTS
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">{heading}</h1>
              <p className="mt-1 text-base font-semibold text-neutral-600">{subtitle}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Chip accent>{serviceType === "OUTSTATION" ? tripLabel(tripType) || "Outstation" : serviceLabel(serviceType)}</Chip>
                {pickupCity && <Chip icon={<MapPin size={13} />}>{pickupCity}</Chip>}
                {dropCity && <Chip icon={<MapPin size={13} />}>{dropCity}</Chip>}
                {!pickupCity && city && <Chip icon={<MapPin size={13} />}>{city}</Chip>}
                {date && <Chip icon={<CalendarDays size={13} />}>{dateLabel(date)}</Chip>}
                {time && <Chip icon={<Clock3 size={13} />}>{timeLabel(time)}</Chip>}
                {category && <Chip icon={<CarFront size={13} />}>{title(category)}</Chip>}
                {passengers > 1 && <Chip icon={<Users size={13} />}>{passengers} passengers</Chip>}
                {tripType === "ROUNDTRIP" && days && <Chip>{days} {Number(days) === 1 ? "Day" : "Days"}</Chip>}
                {packageName && !isTour && <Chip>{packageName}</Chip>}
                {airport && <Chip icon={<Plane size={13} />}>{airport}</Chip>}
                {airportSlab && <Chip>{airportSlab} KM slab</Chip>}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push(searchHome)}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 self-start rounded-xl border border-[#e11d2e] bg-white px-5 text-sm font-bold text-[#e11d2e] shadow-sm transition hover:bg-[#fff1f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e11d2e] lg:self-end"
            >
              <SlidersHorizontal size={16} aria-hidden="true" /> Change Search
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-black text-neutral-950">
              {loading ? "Finding vehicles..." : `${sortedListings.length} Vehicle${sortedListings.length === 1 ? "" : "s"} Found`}
            </div>
            <div className="mt-1 text-sm text-neutral-500">
              Verified cabs with a live price for your trip.
            </div>
          </div>

          {!loading && sortedListings.length > 0 && (
            <label className="flex items-center gap-3 text-sm font-semibold text-neutral-600">
              Sort by
              <span className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="min-h-[44px] appearance-none rounded-xl border border-neutral-200 bg-white py-2 pl-4 pr-10 font-bold text-neutral-900 shadow-sm outline-none transition focus:border-[#e11d2e] focus:ring-4 focus:ring-red-500/10"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                  <option value="trips">Most Trips</option>
                </select>
                <ChevronDown size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              </span>
            </label>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl border border-neutral-200 bg-white p-14 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-neutral-200 border-t-[#e11d2e]" />
            <div className="mt-5 font-bold text-neutral-800">Finding your best vehicles</div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center font-semibold text-red-700">{error}</div>
        )}

        {!loading && !error && sortedListings.length === 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center sm:p-14">
            <div className="text-xl font-black text-neutral-900">No cabs available for this trip right now</div>
            <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-600">
              {passengers > 1 && listings.length > 0
                ? `${listings.length} car${listings.length === 1 ? " is" : "s are"} available, but none seat ${passengers} passengers. Try fewer passengers or another date.`
                : "Try another date or time, modify your trip, or check again later for a current quote and matching cab."}
            </p>
            <button
              type="button"
              onClick={() => router.push(searchHome)}
              className="mt-6 rounded-xl bg-[#e11d2e] px-6 py-3 font-black text-white shadow-lg shadow-red-600/20 hover:bg-[#c8102e]"
            >
              Modify trip or date
            </button>
          </div>
        )}

        {!loading && !error && sortedListings.length > 0 && (
          <div className="space-y-6">
            {sortedListings.map((listing) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                bestPrice={lowestFare != null && Number(listing.pricing.finalPayable) === lowestFare}
                onBook={handleBook}
                bookingLoading={selectedListingId === listing.id}
                galleryIndex={galleryIndex[listing.id] || 0}
                setGalleryIndex={(value) =>
                  setGalleryIndex((previous) => ({ ...previous, [listing.id]: value }))
                }
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Chip({ children, icon, accent = false }: { children: React.ReactNode; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold ${accent ? "border-red-200 bg-red-50 text-[#c8102e]" : "border-neutral-200 bg-white text-neutral-800 shadow-sm"}`}>
      {icon && <span className="text-[#e11d2e]" aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

function MarketplaceListingCard({
  listing,
  bestPrice,
  onBook,
  bookingLoading,
  galleryIndex,
  setGalleryIndex,
}: {
  listing: Listing;
  bestPrice: boolean;
  onBook: (listing: Listing) => void;
  bookingLoading: boolean;
  galleryIndex: number;
  setGalleryIndex: (value: number) => void;
}) {
  const photos = listing.media?.vehiclePhotos ?? [];
  const currentPhoto = photos[galleryIndex];
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({});
  const showPhoto = currentPhoto && !brokenPhotos[currentPhoto];
  const vehicleRating = listing.ratings?.vehicle?.average ?? listing.marketplace.rating;
  const vendorRating = listing.ratings?.vendor;
  const driverRating = listing.ratings?.driver;
  const pkg = listing.pricing;
  const quote = pkg.quote;
  const isTour = pkg.packageType === "TOUR_PACKAGE";

  const quoteMeta = pkg.quote as any;

  // Tours are fixed-price circuits (stored on a roundtrip rule) and never show the daily roundtrip breakdown.
  const isRoundTripDisplay = !isTour && (
    pkg.tripType === "ROUNDTRIP" ||
    quoteMeta?.calculationRule?.operational?.service === "ROUNDTRIP");

  const roundTripDisplayDays = isRoundTripDisplay
    ? Math.max(1, Number(quoteMeta?.tripMetrics?.days || 1))
    : 1;

  const nextPhoto = () => {
    if (photos.length) setGalleryIndex((galleryIndex + 1) % photos.length);
  };
  const previousPhoto = () => {
    if (photos.length) setGalleryIndex((galleryIndex - 1 + photos.length) % photos.length);
  };

  // Every amount below comes from the central quote; nothing is recalculated here.
  const nonZero = (value?: string | null) => value != null && Number(value) !== 0;
  const fareRows: [string, string][] = [];
  if (quote?.vendorFare != null) fareRows.push(["Base fare", currency(Number(quote.vendorFare))]);
  else if (pkg.baseFare != null) fareRows.push(["Base fare", currency(pkg.baseFare)]);
  if (quote?.platformFee != null) fareRows.push(["Platform fee", currency(Number(quote.platformFee))]);
  if (quote?.taxAmount != null) fareRows.push(["GST", currency(Number(quote.taxAmount))]);
  if (nonZero(quote?.passThroughTotal)) fareRows.push(["Other charges", currency(Number(quote.passThroughTotal))]);
  if (nonZero(quote?.vendorFundedDiscount)) fareRows.push(["Vendor discount", `− ${currency(Math.abs(Number(quote.vendorFundedDiscount)))}`]);
  if (nonZero(quote?.rideGridFundedDiscount)) fareRows.push(["RideGrid discount", `− ${currency(Math.abs(Number(quote.rideGridFundedDiscount)))}`]);

  const inclusionRows: [string, string][] = [];
  if (pkg.includedKm != null) inclusionRows.push(["Included KM", `${pkg.includedKm} KM${isRoundTripDisplay && pkg.includedKmPerDay != null ? ` (${pkg.includedKmPerDay} KM/day)` : ""}`]);
  if (pkg.includedHours != null) inclusionRows.push(["Included hours", `${pkg.includedHours} Hrs`]);
  if (pkg.extraKmRate != null) inclusionRows.push(["Extra KM", `${currency(pkg.extraKmRate)} / KM`]);
  if (pkg.extraHourRate != null) inclusionRows.push(["Extra hour", `${currency(pkg.extraHourRate)} / Hr`]);
  if (pkg.driverAllowance != null) inclusionRows.push(["Driver allowance", pkg.driverAllowance === 0
    ? "Included"
    : isRoundTripDisplay && pkg.driverAllowancePerDay != null
      ? `${currency(pkg.driverAllowance)} (${currency(pkg.driverAllowancePerDay)}/day)`
      : currency(pkg.driverAllowance)]);
  if (pkg.nightCharge != null) inclusionRows.push(["Night charges", currency(pkg.nightCharge)]);
  if (pkg.waitingCharge != null) inclusionRows.push(["Waiting", currency(pkg.waitingCharge)]);
  if (pkg.tollCharge != null) inclusionRows.push(["Toll", currency(pkg.tollCharge)]);
  if (pkg.parkingCharge != null) inclusionRows.push(["Parking", currency(pkg.parkingCharge)]);
  if (pkg.otherCharges != null) inclusionRows.push(["Other charges", currency(pkg.otherCharges)]);

  const passThrough = quote?.passThroughCharges ?? [];
  const excludedNotes = passThrough.filter((c) => !c.included).map((c) => c.name);
  const showTollNote = (pkg.pricingType === "OUTSTATION" || isTour) && pkg.tollCharge == null && pkg.parkingCharge == null;

  return (
    <article className="overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(17,17,20,0.04),0_24px_48px_-32px_rgba(17,17,20,0.28)] transition hover:shadow-[0_1px_2px_rgba(17,17,20,0.05),0_28px_56px_-30px_rgba(17,17,20,0.34)]">
      <div className="grid lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)_minmax(0,340px)]">
        {/* REAL VEHICLE MEDIA */}
        <div className="p-3 sm:p-4 lg:pr-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-50 ring-1 ring-inset ring-neutral-200/70">
            {showPhoto ? (
              <img
                src={currentPhoto}
                alt={`${listing.vehicle.make} ${listing.vehicle.model}`}
                loading="lazy"
                decoding="async"
                onError={() => setBrokenPhotos((previous) => ({ ...previous, [currentPhoto]: true }))}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <CarFront size={44} strokeWidth={1.5} className="text-neutral-300" aria-hidden="true" />
                <div className="mt-3 text-sm font-bold text-neutral-500">Photo coming soon</div>
                <div className="mt-1 text-xs text-neutral-400">{listing.vehicle.make} {listing.vehicle.model}</div>
              </div>
            )}

            {bestPrice && (
              <span className="absolute left-3 top-3 rounded-full bg-[#e11d2e] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/30">
                Best Price
              </span>
            )}

            {photos.length > 1 && (
              <>
                <button type="button" onClick={previousPhoto} aria-label="Previous vehicle photo" className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur transition hover:bg-white"><ChevronLeft size={18} /></button>
                <button type="button" onClick={nextPhoto} aria-label="Next vehicle photo" className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-900 shadow-md backdrop-blur transition hover:bg-white"><ChevronRight size={18} /></button>
                <span className="absolute bottom-3 right-3 rounded-full bg-neutral-950/70 px-2.5 py-1 text-[11px] font-bold text-white">{galleryIndex + 1} / {photos.length}</span>
              </>
            )}
          </div>

          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.slice(0, 5).map((photo, photoIndex) => (
                <button
                  key={`${photo}-${photoIndex}`}
                  type="button"
                  onClick={() => setGalleryIndex(photoIndex)}
                  aria-label={`Show vehicle photo ${photoIndex + 1}`}
                  className={`h-12 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${galleryIndex === photoIndex ? "border-[#e11d2e]" : "border-transparent opacity-80 hover:opacity-100"}`}
                >
                  <img src={photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </button>
              ))}
              {photos.length > 5 && (
                <button type="button" onClick={() => setGalleryIndex(5)} className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-xs font-black text-neutral-700">
                  +{photos.length - 5}
                </button>
              )}
            </div>
          )}
        </div>

        {/* VEHICLE + VENDOR + DRIVER */}
        <div className="min-w-0 px-4 pb-5 sm:px-6 lg:py-6">
          {isTour && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-gradient-to-r from-[#fff5f5] to-white p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e11d2e]">Tour</div>
              <div className="mt-1 text-lg font-black text-neutral-950">{pkg.packageName || "Tour package"}</div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-neutral-600">
                {(pkg.city || listing.location.city) && <span className="inline-flex items-center gap-1"><MapPin size={14} className="text-[#e11d2e]" aria-hidden="true" /> From {pkg.city || listing.location.city}</span>}
                {pkg.tripDays ? <span className="inline-flex items-center gap-1"><CalendarDays size={14} className="text-[#e11d2e]" aria-hidden="true" /> {pkg.tripDays} {pkg.tripDays === 1 ? "Day" : "Days"}</span> : null}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight text-neutral-950">{listing.vehicle.make} {listing.vehicle.model}</h2>
                {listing.vehicle.variant && (
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-bold text-neutral-700">
                    {listing.vehicle.variant}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-neutral-500">
                {title(listing.vehicle.category)}
                {listing.vehicle.registrationNumber ? <> · <span className="font-mono tracking-wide text-neutral-700">{listing.vehicle.registrationNumber}</span></> : null}
              </p>
            </div>

            {listing.ratings?.vehicle?.count ? (
              <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-black text-amber-800">
                <Star size={14} className="fill-amber-400 text-amber-400" aria-hidden="true" /> {stars(vehicleRating)}
                <span className="font-semibold text-amber-700/80">({listing.ratings.vehicle.count})</span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Spec icon={<Users size={15} />} label="Seats" value={`${listing.vehicle.seatingCapacity} Seater`} />
            <Spec icon={<Fuel size={15} />} label="Fuel" value={title(listing.vehicle.fuelType)} />
            <Spec icon={<Cog size={15} />} label="Transmission" value={title(listing.vehicle.transmission)} />
            {listing.vehicle.year != null && <Spec icon={<CalendarDays size={15} />} label="Model year" value={String(listing.vehicle.year)} />}
            {listing.vehicle.color && <Spec icon={<Palette size={15} />} label="Color" value={listing.vehicle.color} />}
            {listing.vehicle.luggageCapacity != null && <Spec icon={<Luggage size={15} />} label="Luggage" value={`${listing.vehicle.luggageCapacity} Bags`} />}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-500">Vendor</div>
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-black text-[#c8102e] ring-1 ring-red-100">
                  {initials(listing.vendor?.companyName)}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-black text-neutral-900">{listing.vendor?.companyName || "Vendor"}</div>
                  {listing.vendor?.verified && <VerifiedBadge text="Verified vendor" />}
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs font-semibold text-neutral-500">
                    {listing.location.city && <span className="inline-flex items-center gap-1"><MapPin size={12} aria-hidden="true" />{listing.location.city}</span>}
                    {vendorRating?.average != null && <span className="inline-flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" />{ratingBlock(vendorRating)}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-500">Assigned driver</div>
              <div className="mt-3 flex items-start gap-3">
                {listing.media?.driverPhoto ? (
                  <img src={listing.media.driverPhoto} alt={listing.driver?.name || "Driver"} loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-neutral-200" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-black text-emerald-700 ring-1 ring-emerald-100">
                    {initials(listing.driver?.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-black text-neutral-900">{listing.driver?.name || "Driver to be assigned"}</div>
                  {listing.driver?.verified && <VerifiedBadge text="Verified driver" />}
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs font-semibold text-neutral-500">
                    {driverRating?.average != null && <span className="inline-flex items-center gap-1"><Star size={12} className="fill-amber-400 text-amber-400" aria-hidden="true" />{ratingBlock(driverRating)}</span>}
                    {listing.driver && <span className="inline-flex items-center gap-1 text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />Active &amp; assigned</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {listing.marketplace.verified && <StatusBadge text="Verified vehicle" />}
            {listing.marketplace.available !== false && <StatusBadge text="Available" />}
            {listing.marketplace.totalTrips > 0 && (
              <span className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-bold text-neutral-600">
                {listing.marketplace.totalTrips} completed trip{listing.marketplace.totalTrips === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {pkg.notes && (
            <p className="mt-4 whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
              <span className="font-bold">{isTour ? "Tour notes" : "Vendor notes"}: </span>{pkg.notes}
            </p>
          )}
        </div>

        {/* FARE */}
        <div className="border-t border-neutral-200 bg-gradient-to-b from-[#fffafa] to-white p-4 sm:p-6 lg:border-l lg:border-t-0">
          <div className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-neutral-500">
            {isTour ? "Tour package" : "Total package"}
            {pkg.tripDays ? ` · ${pkg.tripDays} ${pkg.tripDays === 1 ? "Day" : "Days"}` : ""}
          </div>
          <div className="mt-1 text-base font-black text-neutral-900">{packageHeadline(listing)}</div>
          {locationLine(listing) && (
            <div className="mt-0.5 text-xs font-semibold text-neutral-500">{locationLine(listing)}</div>
          )}

          <div className={`${r.fareCard} mt-4 rounded-2xl border border-red-100 bg-white p-4`}>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#c8102e]">Final payable</div>
            <div className="mt-1 text-[40px] font-black leading-none tracking-tight text-[#e11d2e] tabular-nums">{currency(pkg.finalPayable)}</div>
            <div className="mt-1.5 text-xs font-semibold text-neutral-500">Includes GST &amp; platform fee</div>

            {fareRows.length > 0 && (
              <dl className="mt-4 space-y-1.5 border-t border-dashed border-neutral-200 pt-3 text-[13px]">
                {fareRows.map(([label, value]) => <PriceLine key={label} label={label} value={value} />)}
                <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-2">
                  <dt className="font-bold text-neutral-900">Final payable</dt>
                  <dd className="font-black text-[#e11d2e] tabular-nums">{currency(pkg.finalPayable)}</dd>
                </div>
              </dl>
            )}
          </div>

          {inclusionRows.length > 0 && (
            <dl className="mt-4 space-y-1.5 rounded-2xl border border-neutral-200 bg-white p-4 text-[13px]">
              {inclusionRows.map(([label, value]) => <PriceLine key={label} label={label} value={value} />)}
            </dl>
          )}

          {pkg.pricingType === "AIRPORT" && (
            <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700">
              {pkg.airportName || "Airport"}{pkg.transferDirection ? ` • ${title(pkg.transferDirection)}` : ""}{pkg.includedKm != null ? ` • ${pkg.includedKm} KM slab` : ""}
            </div>
          )}

          {isRoundTripDisplay && (
            <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
              <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-neutral-500">Round trip package</div>
              <dl className="grid gap-1.5 text-xs">
                <PriceLine label="Trip duration" value={`${roundTripDisplayDays} ${roundTripDisplayDays === 1 ? "Day" : "Days"}`} />
                <PriceLine label="Daily package" value={`${currency(Number(pkg.baseFare || 0) / roundTripDisplayDays)} / day`} />
              </dl>
            </div>
          )}

          {(excludedNotes.length > 0 || showTollNote) && (
            <p className="mt-3 text-[11px] leading-relaxed text-neutral-500">
              {excludedNotes.length > 0
                ? `${excludedNotes.join(", ")} payable as actuals.`
                : "Toll, parking and state tax, where applicable, are payable as actuals."}
            </p>
          )}

          <details className="group mt-3 text-xs text-neutral-600">
            <summary className="cursor-pointer select-none font-bold text-neutral-700 hover:text-[#e11d2e]">Full fare details</summary>
            <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-3"><FareDetails value={pkg.quote} /></div>
          </details>

          <button
            type="button"
            disabled={bookingLoading}
            onClick={() => onBook(listing)}
            className="group/cta mt-5 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#e11d2e] px-5 text-base font-black text-white shadow-[0_12px_28px_-10px_rgba(225,29,46,0.65)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#c8102e] hover:shadow-[0_18px_34px_-12px_rgba(225,29,46,0.7)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e11d2e] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {bookingLoading ? "Opening..." : <>Book Vehicle <ArrowRight size={18} aria-hidden="true" className="transition group-hover/cta:translate-x-0.5 motion-reduce:transition-none" /></>}
          </button>

          <div className="mt-3 flex items-center justify-center gap-4 text-[11px] font-bold text-neutral-600">
            <span className="inline-flex items-center gap-1 text-emerald-700"><Zap size={13} aria-hidden="true" /> Instant confirmation</span>
            <span className="inline-flex items-center gap-1"><ShieldCheck size={13} aria-hidden="true" /> Secure booking</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-2.5">
      <span className="shrink-0 text-[#e11d2e]" aria-hidden="true">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</div>
        <div className="truncate text-sm font-black text-neutral-900">{value}</div>
      </div>
    </div>
  );
}

function VerifiedBadge({ text }: { text: string }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
      <BadgeCheck size={12} aria-hidden="true" /> {text}
    </span>
  );
}

function StatusBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold text-emerald-700">
      <CheckCircle2 size={12} aria-hidden="true" /> {text}
    </span>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-bold text-neutral-900 tabular-nums">{value}</dd>
    </div>
  );
}
