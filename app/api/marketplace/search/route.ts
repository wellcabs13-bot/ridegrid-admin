import { NextRequest, NextResponse } from "next/server";
import { PricingType, TripType } from "@prisma/client";
import { marketplaceListingService } from "@/lib/services/marketplace/MarketplaceListingService";
import { PricingError, SERVICES } from "@/lib/services/pricing/engine";

// Public, anonymous endpoint: reject unsupported filters with a clear 400 and never
// echo internal (database) error text to the caller.
const SERVICE_TYPES = new Set<string>(["", ...Object.values(PricingType), ...SERVICES]);
const TRIP_TYPES = new Set<string>(["", ...Object.values(TripType)]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

const invalid = (message: string) => NextResponse.json({ success: false, message }, { status: 400 });

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const serviceType = (p.get("serviceType") || "").trim();
    const tripType = (p.get("tripType") || "").trim();
    const date = (p.get("date") || "").trim();
    const time = (p.get("time") || "").trim();
    if (!SERVICE_TYPES.has(serviceType)) return invalid("Choose a supported service.");
    if (!TRIP_TYPES.has(tripType)) return invalid("Choose a supported trip type.");
    if (date && (!DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)))) return invalid("Choose a valid pickup date.");
    if (time && !TIME.test(time)) return invalid("Choose a valid pickup time.");

    const data = await marketplaceListingService.search({
      serviceType,
      tripType,
      pickupCity: p.get("pickupCity") || "",
      dropCity: p.get("dropCity") || "",
      city: p.get("city") || "",
      packageName: p.get("packageName") || "",
      airport: p.get("airport") || "",
      airportDirection: p.get("airportDirection") || "",
      airportSlab: p.get("airportSlab") || "",
      category: p.get("category") || "",
      date,
      time,
      days: p.get("days") || "",
      search: p.get("search") || p.get("q") || "",
      page: Number(p.get("page")) || 1,
      limit: Number(p.get("limit")) || 20,
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof PricingError) return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    if (error instanceof Error && error.message === "Invalid reservation date.") return invalid("Choose a valid pickup date and time.");
    console.error("GET /api/marketplace/search:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Marketplace search is temporarily unavailable. Please retry.",
      },
      { status: 500 }
    );
  }
}
