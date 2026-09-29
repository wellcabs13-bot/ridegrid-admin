import { NextResponse } from "next/server";
import { listMarketplaceOptions } from "@/lib/services/marketplace/MarketplaceOptionsService";

export async function GET() {
  try {
    const data = await listMarketplaceOptions();

    return NextResponse.json({
      success: true,
      data,
      tours: [],
      toursConfigured: false,
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/marketplace/options:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load current marketplace pricing.",
      },
      { status: 500 }
    );
  }
}
