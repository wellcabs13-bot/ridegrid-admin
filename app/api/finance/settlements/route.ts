import { NextRequest, NextResponse } from "next/server";

import { financeService } from "@/lib/services/finance/FinanceService";

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url);

    const vendorId =
      searchParams.get("vendorId");

    const data = vendorId
      ? await financeService.getVendorSettlements(
          vendorId
        )
      : await financeService.getSettlements();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/finance/settlements:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch settlements.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const settlement =
      await financeService.createSettlement(
        body
      );

    return NextResponse.json(
      {
        success: true,
        message: "Settlement created successfully.",
        data: settlement,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/finance/settlements:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create settlement.",
      },
      { status: 500 }
    );
  }
}