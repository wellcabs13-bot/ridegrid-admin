import { BookingStatus, BookingStatusAction, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPaymentServerSide, payuInstrumentToPaymentMethod } from "@/lib/payments/payu";
import { findBookingConflict } from "@/lib/services/marketplace/BookingAvailabilityService";
import { auditLog } from "@/lib/audit";
import { createRideGridEvent } from "@/lib/events/event-bus";
import { dispatchRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";

export class PayUTransactionNotFoundError extends Error {
  constructor() { super("PayU transaction not found."); this.name = "PayUTransactionNotFoundError"; }
}

// Lazily flips an abandoned AWAITING_PAYMENT hold to CANCELLED once its holdExpiresAt
// has passed, so status/retry reads never show a hold as "still pending" forever, and
// a fresh booking is required instead of resurrecting a slot that may have moved on to
// someone else. Idempotent and race-safe via the same PENDING-guarded updateMany claim
// used elsewhere in this module.
//
// Deliberately does NOT touch the Transaction row: it stays PENDING so that if PayU's
// success response arrives after this expiry (a slow webhook, or the customer actually
// completing checkout just past the deadline), reconcilePayuTransaction below still
// gets a chance to detect the captured payment and flag it refund-required, rather than
// silently discarding a real charge as an ordinary "failed" attempt.
export async function expireStaleHold(booking: { id: string; status: BookingStatus; holdExpiresAt: Date | null }) {
  if (booking.status !== BookingStatus.AWAITING_PAYMENT) return false;
  if (!booking.holdExpiresAt || booking.holdExpiresAt > new Date()) return false;

  const claim = await prisma.booking.updateMany({
    where: { id: booking.id, status: BookingStatus.AWAITING_PAYMENT },
    data: { status: BookingStatus.CANCELLED, holdExpiresAt: null },
  });

  if (claim.count === 1) {
    await prisma.bookingStatusHistory.create({
      data: {
        bookingId: booking.id, previousStatus: BookingStatus.AWAITING_PAYMENT, currentStatus: BookingStatus.CANCELLED,
        action: BookingStatusAction.CANCELLED, remarks: "PayU payment hold expired before a successful payment was received.",
      },
    });
  }

  return true;
}

type ReconcileResult = {
  transactionId: string;
  bookingId: string | null;
  bookingNumber: string | null;
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus | null;
  alreadyProcessed: boolean;
  confirmed: boolean;
  refundRequired: boolean;
};

async function finalizeWithoutClaim(
  transactionId: string,
  paymentStatus: PaymentStatus,
  bookingStatus: BookingStatus | null,
  bookingId: string | null,
  bookingNumber: string | null,
  alreadyProcessed: boolean
): Promise<ReconcileResult> {
  return { transactionId, bookingId, bookingNumber, paymentStatus, bookingStatus, alreadyProcessed, confirmed: paymentStatus === PaymentStatus.PAID, refundRequired: false };
}

// Authoritative PayU reconciliation for the booking hold lifecycle. Always re-derives
// truth from PayU's own verify_payment API - never from the posted callback/webhook
// fields - and is safe to call multiple times (duplicate callback + webhook, retries):
// only the call that wins an atomic PENDING->terminal claim on the Transaction ever
// mutates the Booking or dispatches events; every other call is a no-op that reports
// the already-settled outcome.
export async function reconcilePayuTransaction(txnid: string): Promise<ReconcileResult> {
  const existing = await prisma.transaction.findFirst({
    where: { referenceNumber: txnid, gatewayName: "PAYU" },
    include: { booking: true },
  });

  if (!existing) throw new PayUTransactionNotFoundError();

  if (existing.paymentStatus !== PaymentStatus.PENDING) {
    return finalizeWithoutClaim(
      existing.id, existing.paymentStatus, existing.booking?.status ?? null,
      existing.bookingId, existing.booking?.bookingNumber ?? null, true
    );
  }

  const verified = await verifyPaymentServerSide(txnid);

  if (verified.txnid !== txnid) {
    throw new Error("PayU verify_payment returned a mismatched transaction id.");
  }

  let isPaid = verified.status === "success";
  let failureReason: string | null = null;

  if (isPaid) {
    const expectedAmount = Number(existing.amount);
    const reportedAmount = verified.amount != null ? Number(verified.amount) : NaN;
    if (!Number.isFinite(reportedAmount) || Math.abs(reportedAmount - expectedAmount) > 0.01) {
      isPaid = false;
      failureReason = "Amount reported by PayU did not match the booking amount.";
    } else if (!verified.mihpayid) {
      isPaid = false;
      failureReason = "PayU did not return a payment id for a successful transaction.";
    }
  }

  const instrument = payuInstrumentToPaymentMethod(verified.mode);

  const result = await prisma.$transaction(async (tx) => {
    const claim = await tx.transaction.updateMany({
      where: { id: existing.id, paymentStatus: PaymentStatus.PENDING },
      data: {
        paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.FAILED,
        gatewayTransactionId: verified.mihpayid || undefined,
        gatewayName: "PAYU",
        gatewayResponse: verified as unknown as Prisma.InputJsonValue,
        processedAt: isPaid ? new Date() : undefined,
        remarks: failureReason ?? undefined,
        ...(instrument ? { paymentMethod: instrument } : {}),
      },
    });

    if (claim.count === 0) {
      // Lost the race to a concurrent callback/webhook call for the same transaction.
      const latest = await tx.transaction.findUniqueOrThrow({ where: { id: existing.id }, include: { booking: true } });
      return finalizeWithoutClaim(
        latest.id, latest.paymentStatus, latest.booking?.status ?? null,
        latest.bookingId, latest.booking?.bookingNumber ?? null, true
      );
    }

    const booking = existing.booking;
    let bookingStatus = booking?.status ?? null;
    let refundRequired = false;

    if (booking && booking.status === BookingStatus.AWAITING_PAYMENT) {
      if (isPaid) {
        // The hold may have expired (or PayU's response arrived very late) and the
        // vehicle/driver window may have already been given to someone else - never
        // silently overwrite an operational booking. Refund instead of confirming.
        const conflict = await findBookingConflict(tx, {
          vehicleId: booking.vehicleId,
          driverId: booking.driverId,
          window: {
            start: booking.reservedFrom ?? booking.pickupDateTime,
            end: booking.reservedUntil ?? booking.pickupDateTime,
            days: booking.tripDays,
          },
          excludeBookingId: booking.id,
        });

        if (conflict) {
          bookingStatus = BookingStatus.CANCELLED;
          refundRequired = true;
        } else {
          bookingStatus = BookingStatus.CONFIRMED;
        }
      } else {
        bookingStatus = BookingStatus.CANCELLED;
      }

      await tx.booking.update({ where: { id: booking.id }, data: { status: bookingStatus, holdExpiresAt: null } });
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id,
          previousStatus: BookingStatus.AWAITING_PAYMENT,
          currentStatus: bookingStatus,
          action: bookingStatus === BookingStatus.CONFIRMED ? BookingStatusAction.STATUS_CHANGED : BookingStatusAction.CANCELLED,
          remarks: refundRequired
            ? "PayU payment verified successfully, but the hold had expired and the slot was reassigned. Refund required."
            : bookingStatus === BookingStatus.CONFIRMED
              ? "PayU payment verified successfully."
              : (failureReason ?? "PayU payment failed or was not completed."),
        },
      });
    } else if (booking && booking.status === BookingStatus.CANCELLED && isPaid) {
      // The hold had already been lazily expired (expireStaleHold) by the time this
      // verified success arrived. The booking stays cancelled/non-operational - we
      // never resurrect a slot that may already belong to someone else - but the
      // money really was captured, so this must surface as a refund, not vanish.
      refundRequired = true;
      await tx.bookingStatusHistory.create({
        data: {
          bookingId: booking.id, previousStatus: BookingStatus.CANCELLED, currentStatus: BookingStatus.CANCELLED,
          action: BookingStatusAction.STATUS_CHANGED,
          remarks: "PayU payment verified successfully after this booking's hold had already expired. Refund required.",
        },
      });
    }

    return {
      transactionId: existing.id,
      bookingId: booking?.id ?? null,
      bookingNumber: booking?.bookingNumber ?? null,
      paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.FAILED,
      bookingStatus,
      alreadyProcessed: false,
      confirmed: bookingStatus === BookingStatus.CONFIRMED,
      refundRequired,
    } satisfies ReconcileResult;
  });

  if (result.alreadyProcessed) return result;

  await auditLog({
    action: result.confirmed ? "PAYMENT_RECEIVED" : "PAYMENT_FAILED",
    description: `PayU payment ${verified.status} for booking ${result.bookingNumber ?? existing.bookingId}`,
    metadata: {
      transactionId: existing.id, bookingId: result.bookingId, txnid,
      mihpayid: verified.mihpayid, amount: Number(existing.amount), gateway: "PAYU",
      refundRequired: result.refundRequired,
    },
  });

  if (result.refundRequired) {
    await auditLog({
      action: "PAYMENT_REFUND_REQUIRED",
      description: `PayU payment succeeded for booking ${result.bookingNumber} after its hold expired and the slot was reassigned - manual refund required.`,
      metadata: { transactionId: existing.id, bookingId: result.bookingId, txnid, mihpayid: verified.mihpayid, amount: Number(existing.amount) },
    });
  }

  // Vendor/driver only learn about this booking, and only once, the moment payment is
  // actually confirmed - never at hold creation, never more than once.
  if (result.confirmed && result.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: result.bookingId },
      select: { vendorId: true, driverId: true, customerId: true, customer: { select: { userId: true } } },
    });

    if (booking) {
      await dispatchRideGridEvent(createRideGridEvent({
        type: AutomationTrigger.BOOKING_CREATED, module: "BOOKING",
        bookingId: result.bookingId, userId: booking.customer.userId, customerId: booking.customerId,
        vendorId: booking.vendorId, driverId: booking.driverId ?? undefined,
        metadata: { bookingNumber: result.bookingNumber, source: "PAYU_CONFIRMED" },
      }));

      await dispatchRideGridEvent(createRideGridEvent({
        type: AutomationTrigger.PAYMENT_RECEIVED, module: "PAYMENT",
        bookingId: result.bookingId, userId: booking.customer.userId, vendorId: booking.vendorId, customerId: booking.customerId,
        metadata: { bookingNumber: result.bookingNumber, transactionId: result.transactionId, txnid, amount: Number(existing.amount), status: PaymentStatus.PAID },
      }));
    }
  }

  return result;
}
