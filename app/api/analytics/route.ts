import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  analyticsService,
} from "@/lib/services/analytics/AnalyticsService";

function parseDate(
  value: string | null
) {
  if (!value) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date;
}

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const from = parseDate(
      searchParams.get("from")
    );

    const to = parseDate(
      searchParams.get("to")
    );

    const city =
      searchParams.get("city") || undefined;

    const vendorId =
      searchParams.get("vendorId") ||
      undefined;

    const driverId =
      searchParams.get("driverId") ||
      undefined;

    const vehicleId =
      searchParams.get("vehicleId") ||
      undefined;

    const dashboard =
      await analyticsService.getDashboard({
        from,
        to,
        city,
        vendorId,
        driverId,
        vehicleId,
      });

    return NextResponse.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error(
      "GET /api/analytics:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to fetch analytics.",
      },
      { status: 500 }
    );
  }
}