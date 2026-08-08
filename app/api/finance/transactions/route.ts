import { NextRequest, NextResponse } from "next/server";

import { financeService } from "@/lib/services/finance/FinanceService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const bookingId = searchParams.get("bookingId");
    const vendorId = searchParams.get("vendorId");

    if (bookingId) {
      const data =
        await financeService.getBookingTransactions(
          bookingId
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (vendorId) {
      const data =
        await financeService.getVendorTransactions(
          vendorId
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    const data =
      await financeService.getTransactions();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/finance/transactions:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch transactions.",
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

    const transaction =
      await financeService.createTransaction(
        body
      );

    return NextResponse.json(
      {
        success: true,
        message: "Transaction created successfully.",
        data: transaction,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/finance/transactions:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create transaction.",
      },
      { status: 500 }
    );
  }
}