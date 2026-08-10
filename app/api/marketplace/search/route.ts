import { NextRequest } from "next/server";

import {
  success,
  failure,
} from "@/lib/api-response";

import {
  marketplaceListingService,
} from "@/lib/services/marketplace/MarketplaceListingService";

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const pageValue = Number(
      searchParams.get("page") || "1"
    );

    const limitValue = Number(
      searchParams.get("limit") || "20"
    );

    const result =
      await marketplaceListingService.search({
        serviceType:
          searchParams
            .get("serviceType")
            ?.trim() || undefined,

        tripType:
          searchParams
            .get("tripType")
            ?.trim() || undefined,

        pickupCity:
          searchParams
            .get("pickupCity")
            ?.trim() || undefined,

        dropCity:
          searchParams
            .get("dropCity")
            ?.trim() || undefined,

        date:
          searchParams
            .get("date")
            ?.trim() || undefined,

        time:
          searchParams
            .get("time")
            ?.trim() || undefined,

        search:
          searchParams
            .get("q")
            ?.trim() ||
          searchParams
            .get("search")
            ?.trim() ||
          undefined,

        // Backward compatibility
        city:
          searchParams
            .get("city")
            ?.trim() || undefined,

        category:
          searchParams
            .get("category")
            ?.trim() || undefined,

        page:
          Number.isFinite(pageValue)
            ? pageValue
            : 1,

        limit:
          Number.isFinite(limitValue)
            ? limitValue
            : 20,
      });

    return success(
      result,
      "Marketplace search completed successfully."
    );
  } catch (error) {
    console.error(
      "GET /api/marketplace/search error:",
      error
    );

    return failure(
      "Marketplace search failed.",
      500
    );
  }
}