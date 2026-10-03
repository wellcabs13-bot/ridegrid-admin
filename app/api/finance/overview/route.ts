import { NextRequest } from "next/server";
import { staffGuard } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { NextResponse } from "next/server";

import { financeService } from "@/lib/services/finance/FinanceService";

export async function GET(request: NextRequest) {
  const denied = await staffGuard(request, Permission.FINANCE_VIEW); if (denied) return denied;
  try {
    const data = await financeService.getFinanceDashboard();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET /api/finance/overview:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch finance overview.",
      },
      { status: 500 }
    );
  }
}
