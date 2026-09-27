import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, PaymentStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPaymentForm } from "@/lib/payments/payu";
import { verifyCheckoutToken } from "@/lib/payments/checkoutToken";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

// Server-renders a self-submitting form to PayU's hosted checkout. The client supplies
// only an opaque bookingId + integrity token - every payment-relevant field (amount,
// merchant key, action URL, return URLs) is rebuilt here from the authoritative
// Booking/Transaction rows. There is nothing client-editable that could change what
// gets charged, redirect PayU's checkout elsewhere, or turn this into an open redirect.
export async function GET(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get("bookingId")?.trim();
    const token = request.nextUrl.searchParams.get("token")?.trim();

    if (!bookingId || !token) {
      return new NextResponse("Missing checkout reference.", { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        customer: { include: { user: true } },
        transactions: {
          where: { transactionType: TransactionType.BOOKING_PAYMENT, gatewayName: "PAYU" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const transaction = booking?.transactions[0];

    if (!booking || !transaction) {
      return new NextResponse("Checkout session not found.", { status: 404 });
    }

    if (!verifyCheckoutToken(booking.id, transaction.referenceNumber || "", token)) {
      return new NextResponse("Invalid or expired checkout link.", { status: 403 });
    }

    if (booking.status !== BookingStatus.AWAITING_PAYMENT || transaction.paymentStatus !== PaymentStatus.PENDING) {
      return new NextResponse("This payment is no longer pending.", { status: 409 });
    }

    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
      return new NextResponse("This payment hold has expired. Please retry payment.", { status: 409 });
    }

    const origin = new URL(request.url).origin;
    const platform = request.nextUrl.searchParams.get("platform") === "mobile" ? "mobile" : "web";
    const payuForm = buildPaymentForm({
      txnid: transaction.referenceNumber!,
      amount: Number(transaction.amount).toFixed(2),
      productinfo: `RideGrid Booking ${booking.bookingNumber}`,
      firstname: booking.customer.firstName,
      email: booking.customer.user.email,
      surl: `${origin}/api/payments/payu/callback`,
      furl: `${origin}/api/payments/payu/callback`,
      udf1: platform,
    });

    const inputs = Object.entries(payuForm.fields)
      .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value ?? ""))}" />`)
      .join("\n");

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>Redirecting to PayU...</title></head>
<body>
  <p>Redirecting to PayU secure checkout...</p>
  <form id="payu-form" method="post" action="${escapeHtml(payuForm.action)}">
    ${inputs}
  </form>
  <script>document.getElementById("payu-form").submit();</script>
</body>
</html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch (error) {
    console.error("PAYU CHECKOUT PAGE ERROR:", error);
    return new NextResponse("Unable to open PayU checkout.", { status: 500 });
  }
}
