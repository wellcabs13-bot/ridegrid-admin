import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus, TransactionType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { bookingScope } from "@/lib/request-access";
import { buildPaymentForm, encodeCheckoutData } from "@/lib/payments/payu";

// Re-initiates a PayU checkout for a booking whose payment is still pending/failed,
// without creating a second booking. Reuses the same Transaction row so the amount
// keeps coming from what was already committed at booking time, never the client.
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const headerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    const cookieToken =
      request.cookies.get("ridegrid_access_token")?.value ?? request.cookies.get("ridegrid-token")?.value;

    const user = await authenticate(headerToken ?? cookieToken);

    const body = await request.json();
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
    const bookingNumber = typeof body?.bookingNumber === "string" ? body.bookingNumber.trim() : "";
    const platform = body?.platform === "mobile" ? "mobile" : "web";

    if (!bookingId) {
      return NextResponse.json({ success: false, message: "Booking is required." }, { status: 400 });
    }

    if (!user && !bookingNumber) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        ...(user ? bookingScope({ id: user.id, role: user.role as UserRole }) : { bookingNumber }),
        id: bookingId,
        deletedAt: null,
      },
      include: {
        customer: { include: { user: true } },
        transactions: {
          where: { transactionType: TransactionType.BOOKING_PAYMENT, gatewayName: "PAYU" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found." }, { status: 404 });
    }

    const transaction = booking.transactions[0];
    if (!transaction) {
      return NextResponse.json({ success: false, message: "This booking has no online payment attempt to retry." }, { status: 409 });
    }

    if (transaction.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json({ success: false, message: "This booking is already paid." }, { status: 409 });
    }

    const txnid = `PAYU-${booking.bookingNumber}-R${Date.now().toString(36).toUpperCase()}`;

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        paymentStatus: PaymentStatus.PENDING,
        referenceNumber: txnid,
        gatewayTransactionId: null,
        gatewayResponse: undefined,
        remarks: "PayU Online Payment - awaiting confirmation",
      },
    });

    const origin = new URL(request.url).origin;
    const payuForm = buildPaymentForm({
      txnid,
      amount: Number(booking.finalFare).toFixed(2),
      productinfo: `RideGrid Booking ${booking.bookingNumber}`,
      firstname: booking.customer.firstName,
      email: booking.customer.user.email,
      surl: `${origin}/api/payments/payu/callback`,
      furl: `${origin}/api/payments/payu/callback`,
      udf1: platform,
    });

    const payuCheckoutUrl = `/api/payments/payu/checkout?data=${encodeCheckoutData(payuForm)}`;

    return NextResponse.json({ success: true, data: { payuCheckoutUrl } });
  } catch (error) {
    console.error("PAYU RETRY ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to retry payment." },
      { status: 500 }
    );
  }
}
