import { NextResponse } from "next/server";

import { financeService } from "@/lib/services/finance/FinanceService";

export async function GET() {
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
