import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, PaymentStatus, Prisma, TransactionType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { bookingScope } from "@/lib/request-access";
import { signCheckoutToken } from "@/lib/payments/checkoutToken";
import { expireStaleHold } from "@/lib/payments/payuReconcile";

// Re-initiates a PayU checkout for a booking whose payment is still pending/failed,
// without ever creating a second booking or a second Transaction: this only rotates
// the existing PAYU transaction's txnid and re-arms its checkout link. The amount
// always comes from the Booking/Transaction the server already committed, never the
// client. Retry is only for a hold still in AWAITING_PAYMENT - once a hold has expired
// or failed, the booking is CANCELLED and the customer must start a fresh booking.
const PAYU_HOLD_MINUTES = 12;

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

    let booking = await prisma.booking.findFirst({
      where: {
        ...(user ? bookingScope({ id: user.id, role: user.role as UserRole }) : { bookingNumber }),
        id: bookingId,
        deletedAt: null,
      },
      include: {
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

    if (await expireStaleHold(booking)) {
      return NextResponse.json(
        { success: false, message: "This payment window has expired. Please start a new booking." },
        { status: 409 }
      );
    }

    const transaction = booking.transactions[0];
    if (!transaction) {
      return NextResponse.json({ success: false, message: "This booking has no online payment attempt to retry." }, { status: 409 });
    }

    if (booking.status !== BookingStatus.AWAITING_PAYMENT || transaction.paymentStatus === PaymentStatus.PAID) {
      return NextResponse.json(
        { success: false, message: "This booking's online payment is no longer pending and cannot be retried." },
        { status: 409 }
      );
    }

    const txnid = `PAYU-${booking.bookingNumber}-R${Date.now().toString(36).toUpperCase()}`;

    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: PaymentStatus.PENDING,
          referenceNumber: txnid,
          gatewayTransactionId: null,
          gatewayResponse: Prisma.JsonNull,
          remarks: "PayU Online Payment - awaiting confirmation",
        },
      }),
      prisma.booking.update({
        where: { id: booking.id },
        data: { holdExpiresAt: new Date(Date.now() + PAYU_HOLD_MINUTES * 60_000) },
      }),
    ]);

    const token = signCheckoutToken(booking.id, txnid);
    const payuCheckoutUrl = `/api/payments/payu/checkout?bookingId=${encodeURIComponent(booking.id)}&token=${encodeURIComponent(token)}&platform=${platform}`;

    return NextResponse.json({ success: true, data: { payuCheckoutUrl } });
  } catch (error) {
    console.error("PAYU RETRY ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to retry payment." },
      { status: 500 }
    );
  }
}
