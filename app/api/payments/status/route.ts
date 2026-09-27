import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, PaymentStatus, UserRole, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { bookingScope } from "@/lib/request-access";
import { expireStaleHold } from "@/lib/payments/payuReconcile";

// Single source of truth for "did this booking's online payment go through" -
// the web status page and the mobile payment-return screen both poll this
// instead of trusting anything carried on a redirect URL.
//
// Guest marketplace checkouts have no session, so a guest is allowed through when
// they present the exact bookingNumber alongside the bookingId (the two-part receipt
// code handed back at booking time and echoed on the PayU return redirect) - this
// never carries payment truth itself, it only unlocks looking the real status up.
export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const headerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
    const cookieToken =
      request.cookies.get("ridegrid_access_token")?.value ?? request.cookies.get("ridegrid-token")?.value;

    const user = await authenticate(headerToken ?? cookieToken);

    const bookingId = request.nextUrl.searchParams.get("bookingId")?.trim();
    const bookingNumber = request.nextUrl.searchParams.get("bookingNumber")?.trim();
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
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        holdExpiresAt: true,
        transactions: {
          where: { transactionType: TransactionType.BOOKING_PAYMENT },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { paymentStatus: true, paymentMethod: true, gatewayName: true, amount: true, processedAt: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: "Booking not found." }, { status: 404 });
    }

    let status = booking.status;
    let transaction = booking.transactions[0] ?? null;

    if (await expireStaleHold(booking)) {
      status = BookingStatus.CANCELLED;
      if (transaction?.gatewayName === "PAYU" && transaction.paymentStatus === PaymentStatus.PENDING) {
        transaction = { ...transaction, paymentStatus: PaymentStatus.FAILED };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        status,
        paymentStatus: transaction?.paymentStatus ?? null,
        paymentMethod: transaction?.paymentMethod ?? null,
        gatewayName: transaction?.gatewayName ?? null,
        amount: transaction ? Number(transaction.amount) : null,
      },
    });
  } catch (error) {
    console.error("PAYMENT STATUS ERROR:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to fetch payment status." },
      { status: 500 }
    );
  }
}
