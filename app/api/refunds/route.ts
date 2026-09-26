import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@/lib/auth/middleware";
import { refundService } from "@/lib/services/refund/RefundService";

async function auth(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  const headerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;

  const cookieToken =
    request.cookies.get("ridegrid_access_token")?.value ??
    request.cookies.get("ridegrid-token")?.value;

  return authenticate(headerToken ?? cookieToken);
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const bookingId =
      typeof body?.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    const refund = await refundService.refundBooking({
      bookingId,
      amount:
        body?.amount === undefined
          ? undefined
          : Number(body.amount),
      paymentMethod: body?.paymentMethod,
      referenceNumber: body?.referenceNumber,
      gatewayTransactionId: body?.gatewayTransactionId,
      remarks: body?.remarks,
      performedBy: user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Refund processed successfully.",
        data: refund,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/refunds:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to process refund.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 400 }
    );
  }
}
