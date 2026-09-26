"use client";
import { FareDetails, FareDetailsValue } from "@/components/pricing/FareDetails";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    const items = [...listings];
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
  }, [listings, sortBy]);

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

  const heading = serviceType === "OUTSTATION" && pickupCity && dropCity
    ? `${serviceLabel(serviceType)} · ${tripLabel(tripType)}`
    : `${serviceLabel(serviceType)}${city ? ` · ${city}` : ""}`;

  const subtitle = serviceType === "OUTSTATION"
    ? `${pickupCity}${dropCity ? ` → ${dropCity}` : ""}`
    : serviceType === "AIRPORT"
      ? `${airport || "Airport"}${airportDirection ? ` · ${title(airportDirection)}` : ""}`
      : `Pickup${city ? ` anywhere in ${city}` : ""}`;

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="border-b border-white/10 bg-[#020617]">
        <div className="mx-auto max-w-[1500px] px-6 py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[11px] font-black tracking-[0.28em] text-cyan-300">
                LIVE MARKETPLACE RESULTS
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{heading}</h1>
              <p className="mt-1 text-sm text-slate-300">{subtitle}</p>

              <div className="mt-5 flex flex-wrap gap-2">
                <InfoPill label="Service" value={serviceLabel(serviceType)} />
                {tripType && <InfoPill label="Trip" value={tripLabel(tripType)} />}
                {pickupCity && <InfoPill label="Pickup" value={pickupCity} />}
                {dropCity && <InfoPill label="Drop" value={dropCity} />}
                {date && <InfoPill label="Date" value={dateLabel(date)} />}
                {time && <InfoPill label="Time" value={time} />}
                {category && <InfoPill label="Category" value={title(category)} />}
                {tripType === "ROUNDTRIP" && days && (
                  <InfoPill
                    label="Trip Duration"
                    value={`${days} ${Number(days) === 1 ? "Day" : "Days"}`}
                  />
                )}
                {packageName && <InfoPill label="Package" value={packageName} />}
                {airport && <InfoPill label="Airport" value={airport} />}
                {airportSlab && <InfoPill label="KM Slab" value={`${airportSlab} KM`} />}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/marketplace")}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Change Search
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1500px] px-6 py-7">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xl font-black">
              {loading ? "Finding vehicles..." : `${sortedListings.length} Vehicle${sortedListings.length === 1 ? "" : "s"} Found`}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Real vehicles matched to active saved PricingPackage records.
            </div>
          </div>

          {!loading && sortedListings.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-slate-300">
              Sort by
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-900 px-4 py-2.5 font-semibold text-white outline-none"
              >
                <option value="recommended">Recommended</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
                <option value="trips">Most Trips</option>
              </select>
            </label>
          )}
        </div>

        {loading && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-14 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-400" />
            <div className="mt-5 font-bold">Finding your best vehicles</div>
          </div>
        )}

        {error && !loading && (
          <div className="rounded-3xl border border-red-400/20 bg-red-400/10 p-8 text-center text-red-200">{error}</div>
        )}

        {!loading && !error && sortedListings.length === 0 && (
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-14 text-center">
            <div className="text-xl font-black">No cabs available for this trip right now</div>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-300">
              Try another date or time, modify your trip, or check again later for a current quote and matching cab.
            </p>
            <button
              type="button"
              onClick={() => router.push("/marketplace")}
              className="mt-6 rounded-xl bg-cyan-400 px-6 py-3 font-black text-slate-950"
            >
              Modify trip or date
            </button>
          </div>
        )}

        {!loading && !error && sortedListings.length > 0 && (
          <div className="space-y-6">
            {sortedListings.map((listing, index) => (
              <MarketplaceListingCard
                key={listing.id}
                listing={listing}
                rank={index}
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

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">
      <span className="text-slate-500">{label}: </span>
      <span className="font-bold text-slate-200">{value}</span>
    </div>
  );
}

function MarketplaceListingCard({
  listing,
  rank,
  onBook,
  bookingLoading,
  galleryIndex,
  setGalleryIndex,
}: {
  listing: Listing;
  rank: number;
  onBook: (listing: Listing) => void;
  bookingLoading: boolean;
  galleryIndex: number;
  setGalleryIndex: (value: number) => void;
}) {
  const photos = listing.media?.vehiclePhotos ?? [];
  const currentPhoto = photos[galleryIndex];
  const vehicleRating = listing.ratings?.vehicle?.average ?? listing.marketplace.rating;
  const vendorRating = listing.ratings?.vendor;
  const driverRating = listing.ratings?.driver;
  const pkg = listing.pricing;

  const quoteMeta = pkg.quote as any;

  const isRoundTripDisplay =
    pkg.tripType === "ROUNDTRIP" ||
    quoteMeta?.calculationRule?.operational?.service === "ROUNDTRIP";

  const roundTripDisplayDays = isRoundTripDisplay
    ? Math.max(1, Number(quoteMeta?.tripMetrics?.days || 1))
    : 1;

  const saveAmount =
    pkg.extraKmRate != null && pkg.baseFare > 0
      ? null
      : null;

  const nextPhoto = () => {
    if (photos.length) setGalleryIndex((galleryIndex + 1) % photos.length);
  };
  const previousPhoto = () => {
    if (photos.length) setGalleryIndex((galleryIndex - 1 + photos.length) % photos.length);
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/85 shadow-2xl shadow-black/20">
      <div className="grid lg:grid-cols-[330px_minmax(0,1fr)_310px]">
        {/* REAL VEHICLE MEDIA */}
        <div className="border-b border-white/10 lg:border-b-0 lg:border-r">
          <div className="relative h-[245px] bg-slate-950">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt={`${listing.vehicle.make} ${listing.vehicle.model}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="text-5xl">🚗</div>
                <div className="mt-3 text-sm font-bold text-slate-300">Vehicle photo not uploaded</div>
                <div className="mt-1 text-xs text-slate-500">No demo image is used.</div>
              </div>
            )}

            {rank === 0 && (
              <span className="absolute left-4 top-4 rounded-full bg-cyan-400 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
                Best Price
              </span>
            )}

            {photos.length > 1 && (
              <>
                <button type="button" onClick={previousPhoto} aria-label="Previous vehicle photo" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white">‹</button>
                <button type="button" onClick={nextPhoto} aria-label="Next vehicle photo" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-white">›</button>
              </>
            )}
          </div>

          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-t border-white/10 p-3">
              {photos.slice(0, 5).map((photo, photoIndex) => (
                <button
                  key={`${photo}-${photoIndex}`}
                  type="button"
                  onClick={() => setGalleryIndex(photoIndex)}
                  className={`h-14 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${galleryIndex === photoIndex ? "border-cyan-300" : "border-white/10"}`}
                >
                  <img src={photo} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              {photos.length > 5 && (
                <button type="button" onClick={() => setGalleryIndex(5)} className="flex h-14 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-black">
                  +{photos.length - 5}
                </button>
              )}
            </div>
          )}

          <div className="border-t border-white/10 px-4 py-3 text-xs text-slate-400">
            {photos.length ? `${photos.length} real vehicle photo${photos.length === 1 ? "" : "s"}` : "Real photos will appear after upload"}
          </div>
        </div>

        {/* VEHICLE + VENDOR + DRIVER */}
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black">{listing.vehicle.make} {listing.vehicle.model}</h2>
                {listing.vehicle.variant && (
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-200">
                    {listing.vehicle.variant}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-400">
                {listing.vehicle.registrationNumber || "Registration unavailable"} • {title(listing.vehicle.category)} • {listing.vehicle.seatingCapacity} Seater
              </p>
            </div>

            <div className="rounded-xl border border-amber-300/15 bg-amber-300/10 px-4 py-2 text-right">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-200">Vehicle Rating</div>
              <div className="mt-1 text-lg font-black text-white">
                ★ {stars(vehicleRating)}
              </div>
              <div className="text-[11px] text-slate-400">
                {listing.ratings?.vehicle?.count ?? listing.marketplace.totalTrips} reviews
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Feature text={title(listing.vehicle.fuelType)} />
            <Feature text={title(listing.vehicle.transmission)} />
            {listing.vehicle.year != null && <Feature text={String(listing.vehicle.year)} />}
            {listing.vehicle.color && <Feature text={listing.vehicle.color} />}
            {listing.vehicle.luggageCapacity != null && <Feature text={`${listing.vehicle.luggageCapacity} bags`} />}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Vendor</div>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400/15 text-lg font-black text-cyan-200">
                  {initials(listing.vendor?.companyName)}
                </div>
                <div>
                  <div className="font-black">
                    {listing.vendor?.companyName || "Verified Vendor"}
                    <span className="ml-1 text-cyan-300">✓</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    ★ {ratingBlock(vendorRating)}
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {listing.location.city || "India"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Assigned Driver</div>
              <div className="mt-3 flex items-center gap-3">
                {listing.media?.driverPhoto ? (
                  <img src={listing.media.driverPhoto} alt={listing.driver?.name || "Driver"} className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-black text-emerald-200">
                    {initials(listing.driver?.name)}
                  </div>
                )}
                <div>
                  <div className="font-black">
                    {listing.driver?.name || "Assigned Driver"}
                    <span className="ml-1 text-cyan-300">✓</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    ★ {ratingBlock(driverRating)}
                  </div>
                  <div className="mt-0.5 text-xs text-emerald-300">Active & assigned</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {listing.marketplace.verified && <Badge text="VERIFIED VEHICLE" />}
            <Badge text="ACTIVE PRICING" />
            {listing.marketplace.available !== false && <Badge text="AVAILABLE" />}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            <Stat label="Year" value={listing.vehicle.year != null ? String(listing.vehicle.year) : "—"} />
            <Stat label="Seats" value={`${listing.vehicle.seatingCapacity}`} />
            <Stat label="Luggage" value={listing.vehicle.luggageCapacity != null ? `${listing.vehicle.luggageCapacity} Bags` : "—"} />
            <Stat label="Fuel" value={title(listing.vehicle.fuelType)} />
            <Stat label="Gearbox" value={title(listing.vehicle.transmission)} />
            <Stat label="Color" value={listing.vehicle.color || "—"} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <RatingStat label="Overall" value={vehicleRating} />
            <RatingStat label="Vendor" value={vendorRating?.average ?? null} />
            <RatingStat label="Driver" value={driverRating?.average ?? null} />
            <RatingStat label="Completed Trips" value={listing.marketplace.totalTrips} suffix="" />
          </div>
        </div>

        {/* PRICING */}
        <div className="border-t border-white/10 bg-slate-950/60 p-6 lg:border-l lg:border-t-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                TOTAL PACKAGE
                {(pkg as any).tripDays ? (
                  <>
                    {" · "}
                    {(pkg as any).tripDays}{" "}
                    {(pkg as any).tripDays === 1 ? "DAY" : "DAYS"}
                  </>
                ) : null}
              </div>
          <div className="mt-2 text-xl font-black">{packageHeadline(listing)}</div>

          {locationLine(listing) && (
            <div className="mt-2 text-xs text-slate-400">{locationLine(listing)}</div>
          )}

          <div className="mt-5 flex items-end gap-2">
            <span className="text-4xl font-black text-cyan-300">{currency(pkg.finalPayable)}</span>
            <span className="pb-1 text-xs text-slate-500">Final payable</span>
          </div>

          <div className="mt-5 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs">
            {pkg.includedKm != null && (
              <PriceLine
                label="Included KM"
                value={`${pkg.includedKm} KM${
                  isRoundTripDisplay && pkg.includedKmPerDay != null
                    ? ` (${pkg.includedKmPerDay} KM/day)`
                    : ""
                }`}
              />
            )}
            {pkg.includedHours != null && <PriceLine label="Included Hours" value={`${pkg.includedHours} Hrs`} />}
            {pkg.extraKmRate != null && <PriceLine label="Extra KM" value={`${currency(pkg.extraKmRate)} / KM`} />}
            {pkg.extraHourRate != null && <PriceLine label="Extra Hour" value={`${currency(pkg.extraHourRate)} / Hr`} />}
            {pkg.nightCharge != null && <PriceLine label="Night Charges" value={currency(pkg.nightCharge)} />}
            {pkg.driverAllowance != null && (
              <PriceLine
                label="Driver Allowance"
                value={
                  pkg.driverAllowance === 0
                    ? "Included"
                    : isRoundTripDisplay && pkg.driverAllowancePerDay != null
                      ? `${currency(pkg.driverAllowance)} (${currency(pkg.driverAllowancePerDay)}/day)`
                      : currency(pkg.driverAllowance)
                }
              />
            )}
            {pkg.waitingCharge != null && <PriceLine label="Waiting" value={currency(pkg.waitingCharge)} />}
            {pkg.tollCharge != null && <PriceLine label="Toll" value={currency(pkg.tollCharge)} />}
            {pkg.parkingCharge != null && <PriceLine label="Parking" value={currency(pkg.parkingCharge)} />}
            {pkg.otherCharges != null && <PriceLine label="Other Charges" value={currency(pkg.otherCharges)} />}
          </div>

          {pkg.pricingType === "AIRPORT" && (
            <div className="mt-3 rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-3 py-2 text-xs text-cyan-100">
              {pkg.airportName || "Airport"}{pkg.transferDirection ? ` • ${title(pkg.transferDirection)}` : ""}{pkg.includedKm != null ? ` • ${isRoundTripDisplay ? Number(pkg.includedKm || 0) * roundTripDisplayDays : pkg.includedKm} KM${isRoundTripDisplay && pkg.includedKm != null ? ` (${pkg.includedKm} KM/day)` : ""} slab` : ""}
            </div>
          )}

                    {/* ROUNDTRIP PACKAGE SUMMARY */}
          {isRoundTripDisplay && (
            <div className="my-3 rounded-xl border border-orange-300/20 bg-orange-300/5 p-3">
              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">
                Roundtrip Package
              </div>

              <div className="grid gap-2 text-xs">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Trip Duration</span>
                  <span className="font-black text-white">
                    {roundTripDisplayDays} {roundTripDisplayDays === 1 ? "Day" : "Days"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Daily Package</span>
                  <span className="font-black text-white">
                    {currency(Number(pkg.baseFare || 0) / roundTripDisplayDays)} / day
                  </span>
                </div>

                {pkg.includedKm != null && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Included KM</span>
                    <span className="font-black text-white">
                      {pkg.includedKm} KM
                      <span className="ml-1 font-medium text-slate-400">
                        ({pkg.includedKmPerDay} KM/day)
                      </span>
                    </span>
                  </div>
                )}

                {pkg.driverAllowance != null && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Driver Allowance</span>
                    <span className="font-black text-white">
                      {currency(pkg.driverAllowance)}
                      <span className="ml-1 font-medium text-slate-400">
                        ({currency(pkg.driverAllowancePerDay ?? pkg.driverAllowance)}/day)
                      </span>
                    </span>
                  </div>
                )}

                {pkg.extraKmRate != null && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400">Extra KM</span>
                    <span className="font-black text-white">
                      {currency(pkg.extraKmRate)}/KM
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          <details className="my-3"><summary>Fare details</summary><FareDetails value={pkg.quote}/></details>
          <button
            type="button"
            disabled={bookingLoading}
            onClick={() => onBook(listing)}
            className="mt-6 w-full rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black text-slate-950 shadow-lg shadow-cyan-400/10 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bookingLoading ? "Opening..." : "Book Vehicle"}
          </button>

          <div className="mt-3 text-center text-xs font-bold text-emerald-300">
            ⚡ Instant Confirmation
          </div>
          <div className="mt-2 text-center text-[11px] text-slate-500">
            100% Secure Booking
          </div>
        </div>
      </div>
    </article>
  );
}

function Feature({ text }: { text: string }) {
  return <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">{text}</span>;
}

function Badge({ text }: { text: string }) {
  return <span className="rounded-full border border-emerald-300/15 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black tracking-wider text-emerald-300">{text}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">{value}</div>
    </div>
  );
}

function RatingStat({ label, value, suffix = "★" }: { label: string; value?: number | null; suffix?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-white">
        {typeof value === "number" ? `${Number(value).toFixed(1)} ${suffix}` : "—"}
      </div>
    </div>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className="font-bold text-slate-100">{value}</span>
    </div>
  );
}

