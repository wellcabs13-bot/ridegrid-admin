import { NextRequest, NextResponse } from "next/server";

import { financeService } from "@/lib/services/finance/FinanceService";

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url);

    const vendorId =
      searchParams.get("vendorId");

    if (!vendorId) {
      return NextResponse.json(
        {
          success: false,
          message: "vendorId is required.",
        },
        { status: 400 }
      );
    }

    const wallet =
      await financeService.getVendorWallet(
        vendorId
      );

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor wallet not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    console.error(
      "GET /api/finance/wallet:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch wallet.",
      },
      { status: 500 }
    );
  }
}