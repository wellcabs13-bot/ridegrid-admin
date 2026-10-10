import { NextResponse } from "next/server";
import { listMarketplaceOptions } from "@/lib/services/marketplace/MarketplaceOptionsService";

export async function GET(request: Request) {
  try {
    // ?include=tours adds priced Tour packages (service "TOUR") for the website search.
    const includeTours = new URL(request.url).searchParams.get("include") === "tours";
    const data = await listMarketplaceOptions({ includeTours });

    return NextResponse.json({
      success: true,
      data,
      toursConfigured: data.some((row) => row.service === "TOUR"),
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/marketplace/options:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load current marketplace pricing.",
      },
      { status: 503 }
    );
  }
}
