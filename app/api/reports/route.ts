import { NextRequest, NextResponse } from "next/server";

import {
  reportsService,
} from "@/lib/services/reports/ReportsService";

function parseDate(value: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const report = searchParams.get("report") || "dashboard";

    const filters = {
      from: parseDate(searchParams.get("from")),
      to: parseDate(searchParams.get("to")),
      vendorId: searchParams.get("vendorId") || undefined,
      driverId: searchParams.get("driverId") || undefined,
      vehicleId: searchParams.get("vehicleId") || undefined,
      corporateId: searchParams.get("corporateId") || undefined,
    };

    let data;

    switch (report) {
      case "revenue":
        data = await reportsService.getRevenueReport(filters);
        break;

      case "booking":
        data = await reportsService.getBookingReport(filters);
        break;

      case "vendor":
        data = await reportsService.getVendorReport(filters);
        break;

      case "driver":
        data = await reportsService.getDriverReport(filters);
        break;

      case "vehicle":
        data = await reportsService.getVehicleReport(filters);
        break;

      case "finance":
        data = await reportsService.getFinanceReport(filters);
        break;

      case "gst":
        data = await reportsService.getGSTReport(filters);
        break;

      case "corporate":
        data = await reportsService.getCorporateReport(filters);
        break;

      case "dashboard":
      default:
        data = await reportsService.getDashboard(filters);
        break;
    }

    return NextResponse.json({
      success: true,
      report,
      filters,
      data,
    });
  } catch (error) {
    console.error("GET /api/reports:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to generate report.",
      },
      { status: 500 }
    );
  }
}
