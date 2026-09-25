import { NextRequest, NextResponse } from "next/server";
import { marketplaceListingService } from "@/lib/services/marketplace/MarketplaceListingService";

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;

    const data = await marketplaceListingService.search({
      serviceType: p.get("serviceType") || "",
      tripType: p.get("tripType") || "",
      pickupCity: p.get("pickupCity") || "",
      dropCity: p.get("dropCity") || "",
      city: p.get("city") || "",
      packageName: p.get("packageName") || "",
      airport: p.get("airport") || "",
      airportDirection: p.get("airportDirection") || "",
      airportSlab: p.get("airportSlab") || "",
      category: p.get("category") || "",
      date: p.get("date") || "",
      time: p.get("time") || "",
      days: p.get("days") || "",
      search: p.get("search") || p.get("q") || "",
      page: Number(p.get("page") || 1),
      limit: Number(p.get("limit") || 20),
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET /api/marketplace/search:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Marketplace search failed.",
      },
      { status: 500 }
    );
  }
}
