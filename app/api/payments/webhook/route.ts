import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  verifyWebhookSignature,
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
    const rawBody =
      await request.text();

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Webhook signature is required.",
        },
        { status: 400 }
      );
    }

    if (
      !verifyWebhookSignature(
        rawBody,
        signature
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook signature.",
        },
        { status: 400 }
      );
    }

    const event =
      JSON.parse(rawBody);

    const eventType =
      String(event?.event ?? "");

    if (
      eventType !==
        "payment.captured" &&
      eventType !==
        "payment.failed"
    ) {
      return NextResponse.json({
        success: true,
        ignored: true,
      });
    }

    const payment =
      event?.payload?.payment?.entity;

    if (!payment?.id || !payment?.order_id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment webhook payload.",
        },
        { status: 400 }
      );
    }

    const transaction =
      await prisma.transaction.findFirst({
        where: {
          referenceNumber:
            payment.order_id,
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
            "Transaction not found.",
        },
        { status: 404 }
      );
    }

    if (
      transaction.gatewayTransactionId ===
      payment.id &&
      transaction.paymentStatus ===
        PaymentStatus.PAID
    ) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
      });
    }

    const isCaptured =
      eventType ===
      "payment.captured";

    const updated =
      await prisma.transaction.update({
        where: {
          id: transaction.id,
        },
        data: {
          paymentStatus: isCaptured
            ? PaymentStatus.PAID
            : PaymentStatus.FAILED,
          gatewayTransactionId:
            payment.id,
          gatewayName: "RAZORPAY",
          gatewayResponse:
            payment,
          processedAt: isCaptured
            ? new Date()
            : undefined,
        },
      });

    await auditLog({
      action: isCaptured
        ? "PAYMENT_RECEIVED"
        : "PAYMENT_FAILED",
      description:
        `Razorpay payment ${eventType}`,
      metadata: {
        transactionId:
          transaction.id,
        bookingId:
          transaction.bookingId,
        orderId:
          payment.order_id,
        paymentId:
          payment.id,
        amount:
          Number(payment.amount ?? 0) / 100,
      },
    });

    if (
      isCaptured &&
      transaction.bookingId
    ) {
      const rideGridEvent =
        createRideGridEvent({
          type:
            AutomationTrigger.PAYMENT_RECEIVED,
          module: "PAYMENT",
          bookingId:
            transaction.bookingId,
          vendorId:
            transaction.vendorId ??
            undefined,
          customerId:
            transaction.booking?.customerId,
          metadata: {
            transactionId:
              transaction.id,
            orderId:
              payment.order_id,
            paymentId:
              payment.id,
            amount:
              Number(payment.amount ?? 0) /
              100,
            status:
              PaymentStatus.PAID,
          },
        });

      await dispatchRideGridEvent(
        rideGridEvent
      );
    }

    return NextResponse.json({
      success: true,
      transactionId:
        updated.id,
      status:
        updated.paymentStatus,
    });
  } catch (error) {
    console.error(
      "PAYMENT WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}
