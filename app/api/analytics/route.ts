import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  analyticsService,
} from "@/lib/services/analytics/AnalyticsService";

import { authenticate } from "@/lib/auth/middleware";
import { hasPermission, Permission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

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
    const header = request.headers.get("authorization");
    const user = await authenticate(
      header?.startsWith("Bearer ")
        ? header.slice(7)
        : request.cookies.get("ridegrid_access_token")?.value
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Please sign in." },
        { status: 401 }
      );
    }

    if (
      !hasPermission(user.role as UserRole, Permission.REPORT_VIEW) ||
      user.role === "CORPORATE_ADMIN"
    ) {
      return NextResponse.json(
        { success: false, message: "Not authorized." },
        { status: 403 }
      );
    }

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
    const section =
      searchParams.get("section") || "dashboard";

    const corporateId =
      searchParams.get("corporateId") || undefined;

    if (section === "marketplace") {
      const data =
        await analyticsService.getMarketplaceAnalytics({
          from,
          to,
          city,
          vendorId,
          driverId,
          vehicleId,
        });

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (section === "finance") {
      const data =
        await analyticsService.getFinanceAnalytics({
          from,
          to,
          city,
          vendorId,
          driverId,
          vehicleId,
        });

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (section === "corporate") {
      const data =
        await analyticsService.getCorporateAnalytics(
          {
            from,
            to,
            city,
            vendorId,
            driverId,
            vehicleId,
          },
          corporateId
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (section === "predictive") {
      const data =
        await analyticsService.getPredictiveInsights({
          from,
          to,
          city,
          vendorId,
          driverId,
          vehicleId,
        });

      return NextResponse.json({
        success: true,
        data,
      });
    }

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