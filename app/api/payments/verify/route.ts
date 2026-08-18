import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { transactionRepository } from "@/lib/repositories/transaction";
import {
  verifyPaymentSignature,
  razorpayClient,
} from "@/lib/payments/razorpay";
import { auditLog } from "@/lib/audit";
import {
  createRideGridEvent,
} from "@/lib/events/event-bus";
import {
  dispatchRideGridEvent,
} from "@/lib/events/event-dispatcher";
import {
  AutomationTrigger,
} from "@/types/automation";

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization");

    const headerToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;

    const cookieToken =
      request.cookies.get("ridegrid_access_token")?.value ??
      request.cookies.get("ridegrid-token")?.value;

    const user = await authenticate(
      headerToken ?? cookieToken
    );

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

    const orderId =
      typeof body?.razorpay_order_id === "string"
        ? body.razorpay_order_id.trim()
        : "";

    const paymentId =
      typeof body?.razorpay_payment_id === "string"
        ? body.razorpay_payment_id.trim()
        : "";

    const signature =
      typeof body?.razorpay_signature === "string"
        ? body.razorpay_signature.trim()
        : "";

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment verification details are required.",
        },
        { status: 400 }
      );
    }

    const valid =
      verifyPaymentSignature(
        orderId,
        paymentId,
        signature
      );

    if (!valid) {
      await auditLog({
        action: "PAYMENT_VERIFICATION_FAILED",
        userId: user.id,
        description:
          "Invalid Razorpay payment signature.",
        metadata: {
          orderId,
          paymentId,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment signature.",
        },
        { status: 400 }
      );
    }

    const transaction =
      await prisma.transaction.findFirst({
        where: {
          referenceNumber: orderId,
          gatewayName: "RAZORPAY",
        },
        include: {
          booking: true,
        },
      });

    if (!transaction) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment transaction not found.",
        },
        { status: 404 }
      );
    }

    if (
      transaction.paymentStatus ===
      PaymentStatus.PAID
    ) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        transaction,
      });
    }

    const client = razorpayClient();

    const payment =
      await client.payments.fetch(paymentId);

    if (payment.order_id !== orderId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment does not belong to this order.",
        },
        { status: 400 }
      );
    }

    const expectedAmount =
      Number(transaction.amount) * 100;

    if (
      Number(payment.amount) !==
      Math.round(expectedAmount)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment amount does not match the booking amount.",
        },
        { status: 400 }
      );
    }

    if (
      payment.status !== "captured" &&
      payment.status !== "authorized"
    ) {
      await transactionRepository.update(
        transaction.id,
        {
          paymentStatus:
            PaymentStatus.FAILED,
          gatewayTransactionId:
            paymentId,
          gatewayResponse:
            payment as any,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message: "Payment was not captured.",
        },
        { status: 400 }
      );
    }

    const updated =
      await transactionRepository.update(
        transaction.id,
        {
          paymentStatus:
            PaymentStatus.PAID,
          gatewayTransactionId:
            paymentId,
          gatewayName: "RAZORPAY",
          gatewayResponse:
            payment as any,
          processedAt: new Date(),
        }
      );

    await auditLog({
      action: "PAYMENT_RECEIVED",
      userId: user.id,
      description:
        `Payment received for booking ${transaction.booking?.bookingNumber ?? transaction.bookingId}`,
      metadata: {
        transactionId: transaction.id,
        bookingId: transaction.bookingId,
        orderId,
        paymentId,
        amount: Number(transaction.amount),
        gateway: "RAZORPAY",
      },
    });

    if (transaction.bookingId) {
      const event =
        createRideGridEvent({
          type:
            AutomationTrigger.PAYMENT_RECEIVED,
          module: "PAYMENT",
          userId: user.id,
          bookingId:
            transaction.bookingId,
          vendorId:
            transaction.vendorId ?? undefined,
          customerId:
            transaction.booking?.customerId,
          metadata: {
            transactionId: transaction.id,
            orderId,
            paymentId,
            amount: Number(transaction.amount),
            status: PaymentStatus.PAID,
          },
        });

      await dispatchRideGridEvent(event);
    }

    return NextResponse.json({
      success: true,
      transaction: updated,
    });
  } catch (error) {
    console.error(
      "PAYMENT VERIFY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to verify payment.",
      },
      { status: 500 }
    );
  }
}
