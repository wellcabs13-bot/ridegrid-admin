import { NextRequest } from "next/server";

import { success, failure } from "@/lib/api-response";
import { marketplaceTwinService } from "@/lib/services/marketplace/MarketplaceTwinService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } =
      new URL(request.url);

    const result =
      await marketplaceTwinService.getTwin({
        city:
          searchParams.get("city")?.trim() ||
          undefined,
        vendorId:
          searchParams.get("vendorId")?.trim() ||
          undefined,
      });

    return success(
      result,
      "Digital Marketplace Twin generated successfully."
    );
  } catch (error) {
    console.error(
      "GET /api/marketplace/twin error:",
      error
    );

    return failure(
      "Failed to generate Digital Marketplace Twin.",
      500
    );
  }
}
