import { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPaymentServerSide, payuInstrumentToPaymentMethod } from "@/lib/payments/payu";
import { transactionRepository } from "@/lib/repositories/transaction";
import { auditLog } from "@/lib/audit";
import { createRideGridEvent } from "@/lib/events/event-bus";
import { dispatchRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";

export class PayUTransactionNotFoundError extends Error {
  constructor() { super("PayU transaction not found."); this.name = "PayUTransactionNotFoundError"; }
}

// Authoritative reconciliation for a PayU transaction: always re-derives status from
// PayU's own verify_payment API rather than trusting the redirect/webhook payload.
export async function reconcilePayuTransaction(txnid: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { referenceNumber: txnid, gatewayName: "PAYU" },
    include: { booking: true },
  });

  if (!transaction) throw new PayUTransactionNotFoundError();

  if (transaction.paymentStatus === PaymentStatus.PAID && transaction.gatewayTransactionId) {
    return { transaction, booking: transaction.booking, alreadyProcessed: true, verified: null };
  }

  const verified = await verifyPaymentServerSide(txnid);
  const isPaid = verified.status === "success";
  const instrument = payuInstrumentToPaymentMethod(verified.mode);

  const updated = await transactionRepository.update(transaction.id, {
    paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.FAILED,
    gatewayTransactionId: verified.mihpayid || undefined,
    gatewayName: "PAYU",
    gatewayResponse: verified as any,
    processedAt: isPaid ? new Date() : undefined,
    ...(instrument ? { paymentMethod: instrument } : {}),
  });

  await auditLog({
    action: isPaid ? "PAYMENT_RECEIVED" : "PAYMENT_FAILED",
    description: `PayU payment ${verified.status} for booking ${transaction.booking?.bookingNumber ?? transaction.bookingId}`,
    metadata: {
      transactionId: transaction.id,
      bookingId: transaction.bookingId,
      txnid,
      mihpayid: verified.mihpayid,
      amount: Number(transaction.amount),
      gateway: "PAYU",
    },
  });

  if (isPaid && transaction.bookingId) {
    await dispatchRideGridEvent(createRideGridEvent({
      type: AutomationTrigger.PAYMENT_RECEIVED,
      module: "PAYMENT",
      bookingId: transaction.bookingId,
      vendorId: transaction.vendorId ?? undefined,
      customerId: transaction.booking?.customerId,
      metadata: {
        transactionId: transaction.id,
        txnid,
        mihpayid: verified.mihpayid,
        amount: Number(transaction.amount),
        status: PaymentStatus.PAID,
      },
    }));
  }

  return { transaction: updated, booking: transaction.booking, alreadyProcessed: false, verified };
}
