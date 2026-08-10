import { NextRequest } from "next/server";

import { success, failure } from "@/lib/api-response";
import { marketplaceListingService } from "@/lib/services/marketplace/MarketplaceListingService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const pageValue = Number(searchParams.get("page") || "1");
    const limitValue = Number(searchParams.get("limit") || "20");

    const result =
      await marketplaceListingService.search({
        search:
          searchParams.get("search")?.trim() || undefined,
        city:
          searchParams.get("city")?.trim() || undefined,
        category:
          searchParams.get("category")?.trim() || undefined,
        page: Number.isFinite(pageValue)
          ? pageValue
          : 1,
        limit: Number.isFinite(limitValue)
          ? limitValue
          : 20,
      });

    return success(
      result,
      "Marketplace listings fetched successfully."
    );
  } catch (error) {
    console.error(
      "GET /api/marketplace/listings error:",
      error
    );

    return failure(
      "Failed to fetch marketplace listings.",
      500
    );
  }
}
