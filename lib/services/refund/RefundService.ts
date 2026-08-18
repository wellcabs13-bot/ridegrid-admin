import {
  PaymentMethod,
  PaymentStatus,
  TransactionType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/services/audit/AuditService";

interface RefundInput {
  bookingId: string;
  amount?: number;
  paymentMethod?: PaymentMethod;
  referenceNumber?: string;
  gatewayTransactionId?: string;
  remarks?: string;
  performedBy?: string;
}

export class RefundService {
  async refundBooking(input: RefundInput) {
    const {
      bookingId,
      amount,
      paymentMethod,
      referenceNumber,
      gatewayTransactionId,
      remarks,
      performedBy,
    } = input;

    if (!bookingId) {
      throw new Error("Booking ID is required.");
    }

    if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
      throw new Error("Refund amount must be greater than zero.");
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            transactions: {
              where: {
                transactionType: TransactionType.BOOKING_PAYMENT,
                paymentStatus: PaymentStatus.PAID,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (!booking) {
          throw new Error("Booking not found.");
        }

        const paidAmount = booking.transactions.reduce(
          (sum, transaction) => sum + Number(transaction.amount),
          0
        );

        const alreadyRefunded = Number(booking.refundAmount ?? 0);

        const requestedAmount =
          amount ??
          Math.max(
            Number(booking.finalFare ?? booking.estimatedFare) -
              Number(booking.cancellationCharge ?? 0),
            0
          );

        if (requestedAmount <= 0) {
          throw new Error("No refundable amount available.");
        }

        if (alreadyRefunded + requestedAmount > paidAmount) {
          throw new Error("Refund amount exceeds paid amount.");
        }

        const duplicate = await tx.transaction.findFirst({
          where: {
            bookingId,
            transactionType: TransactionType.REFUND,
            paymentStatus: PaymentStatus.PAID,
            gatewayTransactionId: gatewayTransactionId ?? undefined,
            referenceNumber: referenceNumber ?? undefined,
          },
        });

        if (duplicate) {
          return duplicate;
        }

        const newRefundTotal = alreadyRefunded + requestedAmount;

        const transaction = await tx.transaction.create({
          data: {
            bookingId,
            vendorId: booking.vendorId,
            transactionType: TransactionType.REFUND,
            paymentMethod:
              paymentMethod ??
              booking.transactions[0]?.paymentMethod ??
              PaymentMethod.CASH,
            paymentStatus: PaymentStatus.PAID,
            amount: requestedAmount,
            currency: "INR",
            referenceNumber,
            gatewayName: gatewayTransactionId
              ? "RAZORPAY"
              : undefined,
            gatewayTransactionId,
            remarks:
              remarks ??
              `Refund processed for booking ${booking.bookingNumber}`,
            processedAt: new Date(),
          },
        });

        await tx.booking.update({
          where: { id: bookingId },
          data: {
            refundAmount: newRefundTotal,
          },
        });

        return transaction;
      },
      {
        isolationLevel: "Serializable",
      }
    );

    await auditLog({
      action: "REFUND_PROCESSED",
      userId: performedBy,
      description: `Refund processed for booking ${bookingId}`,
      metadata: {
        bookingId,
        transactionId: result.id,
        amount: Number(result.amount),
        paymentStatus: result.paymentStatus,
      },
    });

    return result;
  }
}

export const refundService = new RefundService();
