import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/auth/middleware";
import { transactionRepository } from "@/lib/repositories/transaction";
import { auditLog } from "@/lib/audit";
import {
  razorpayClient,
} from "@/lib/payments/razorpay";

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

    const bookingId =
      typeof body?.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    const requestedMethod =
      typeof body?.paymentMethod === "string"
        ? body.paymentMethod
        : "UPI";

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking is required.",
        },
        { status: 400 }
      );
    }

    const booking =
      await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          transactions: {
            where: {
              transactionType:
                TransactionType.BOOKING_PAYMENT,
              paymentStatus: {
                in: [
                  PaymentStatus.PENDING,
                  PaymentStatus.PARTIAL,
                  PaymentStatus.PAID,
                ],
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found.",
        },
        { status: 404 }
      );
    }

    const allowedRoles = [
      "SUPER_ADMIN",
      "OPERATIONS",
      "FINANCE",
      "CUSTOMER",
      "VENDOR",
      "CORPORATE_ADMIN",
      "CORPORATE_EMPLOYEE",
    ];

    if (!allowedRoles.includes(String(user.role))) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden.",
        },
        { status: 403 }
      );
    }

    if (
      String(user.role) === "CUSTOMER" &&
      booking.customerId !== user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot pay for this booking.",
        },
        { status: 403 }
      );
    }

    if (
      String(user.role) === "VENDOR" &&
      booking.vendorId !== user.id
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You cannot pay for this booking.",
        },
        { status: 403 }
      );
    }

    const existing =
      booking.transactions[0];

    if (
      existing?.paymentStatus ===
      PaymentStatus.PAID
    ) {
      return NextResponse.json(
        {
          success: true,
          alreadyPaid: true,
          transaction: existing,
        }
      );
    }

    const amount = Number(
      booking.finalFare ??
      booking.estimatedFare
    );

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Booking has an invalid payable amount.",
        },
        { status: 400 }
      );
    }

    const paymentMethod =
      Object.values(PaymentMethod).includes(
        requestedMethod as PaymentMethod
      )
        ? (requestedMethod as PaymentMethod)
        : PaymentMethod.UPI;

    const client = razorpayClient();

    const receipt =
      `RG-${booking.bookingNumber}`
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 40);

    const order =
      await client.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt,
        notes: {
          bookingId: booking.id,
          bookingNumber:
            booking.bookingNumber,
        },
      });

    const transaction =
      existing ??
      (await transactionRepository.create({
        transactionType:
          TransactionType.BOOKING_PAYMENT,
        paymentMethod,
        paymentStatus:
          PaymentStatus.PENDING,
        amount,
        currency: "INR",
        referenceNumber: order.id,
        gatewayName: "RAZORPAY",
        booking: {
          connect: {
            id: booking.id,
          },
        },
        vendor: {
          connect: {
            id: booking.vendorId,
          },
        },
      }));

    if (existing) {
      await transactionRepository.update(
        existing.id,
        {
          paymentMethod,
          amount,
          referenceNumber: order.id,
          gatewayName: "RAZORPAY",
        }
      );
    }

    await auditLog({
      action: "PAYMENT_ORDER_CREATED",
      userId: user.id,
      description:
        `Payment order created for booking ${booking.bookingNumber}`,
      metadata: {
        bookingId: booking.id,
        transactionId: transaction.id,
        orderId: order.id,
        amount,
        currency: "INR",
        gateway: "RAZORPAY",
      },
    });

    return NextResponse.json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID,
      order: {
        id: order.id,
        amount: Number(order.amount),
        currency: order.currency,
      },
      transaction: {
        id: transaction.id,
        status: transaction.paymentStatus,
      },
    });
  } catch (error) {
    console.error(
      "PAYMENT CREATE ORDER ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create payment order.",
      },
      { status: 500 }
    );
  }
}
