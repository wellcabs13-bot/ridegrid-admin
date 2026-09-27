// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const state = { bookings: [] as any[], transactions: [] as any[], history: [] as any[] };

  function findBooking(where: any) {
    return state.bookings.find((b) => (where.id === undefined || b.id === where.id) && (where.status === undefined || b.status === where.status)) ?? null;
  }

  function findTransaction(where: any) {
    return state.transactions.find((t) =>
      (where.id === undefined || t.id === where.id) &&
      (where.referenceNumber === undefined || t.referenceNumber === where.referenceNumber) &&
      (where.gatewayName === undefined || t.gatewayName === where.gatewayName) &&
      (where.paymentStatus === undefined || t.paymentStatus === where.paymentStatus)
    ) ?? null;
  }

  function withBooking(t: any) {
    if (!t) return null;
    return { ...t, booking: state.bookings.find((b) => b.id === t.bookingId) ?? null };
  }

  function makeDb() {
    return {
      transaction: {
        findFirst: vi.fn(async ({ where }: any) => withBooking(findTransaction(where))),
        findUnique: vi.fn(async ({ where }: any) => withBooking(findTransaction(where))),
        findUniqueOrThrow: vi.fn(async ({ where }: any) => {
          const row = withBooking(findTransaction(where));
          if (!row) throw new Error("not found");
          return row;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          const row = findTransaction(where);
          if (!row) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const row = findTransaction(where);
          if (!row) throw new Error("not found");
          Object.assign(row, data);
          return withBooking(row);
        }),
      },
      booking: {
        findFirst: vi.fn(async ({ where }: any) => findBooking(where)),
        findUnique: vi.fn(async ({ where }: any) => findBooking(where)),
        findMany: vi.fn(async () => []),
        update: vi.fn(async ({ where, data }: any) => {
          const row = findBooking(where);
          if (!row) throw new Error("not found");
          Object.assign(row, data);
          return row;
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          const row = findBooking(where);
          if (!row) return { count: 0 };
          Object.assign(row, data);
          return { count: 1 };
        }),
      },
      bookingStatusHistory: {
        create: vi.fn(async ({ data }: any) => {
          state.history.push(data);
          return data;
        }),
      },
      $transaction: vi.fn(async (fn: any) => fn(makeDb())),
    };
  }

  return { state, db: makeDb() };
});

const fns = vi.hoisted(() => ({
  verifyPaymentServerSide: vi.fn(),
  findBookingConflict: vi.fn(async () => null as any),
  dispatchRideGridEvent: vi.fn(async () => ({})),
}));

vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));

vi.mock("@/lib/payments/payu", async () => {
  const actual = await vi.importActual<typeof import("@/lib/payments/payu")>("@/lib/payments/payu");
  return { ...actual, verifyPaymentServerSide: fns.verifyPaymentServerSide };
});

vi.mock("@/lib/services/marketplace/BookingAvailabilityService", () => ({ findBookingConflict: fns.findBookingConflict }));

vi.mock("@/lib/events/event-dispatcher", () => ({ dispatchRideGridEvent: fns.dispatchRideGridEvent }));
vi.mock("@/lib/audit", () => ({ auditLog: vi.fn(async () => null) }));

const { verifyPaymentServerSide, findBookingConflict, dispatchRideGridEvent } = fns;

import { reconcilePayuTransaction, expireStaleHold, PayUTransactionNotFoundError } from "@/lib/payments/payuReconcile";

function seedBooking(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: "booking-1", bookingNumber: "RG1001", status: "AWAITING_PAYMENT",
    vehicleId: "vehicle-1", driverId: "driver-1", customerId: "customer-1",
    customer: { userId: "user-1" }, vendorId: "vendor-1",
    pickupDateTime: new Date("2027-01-01T10:00:00Z"),
    reservedFrom: new Date("2027-01-01T00:00:00Z"), reservedUntil: new Date("2027-01-02T00:00:00Z"), tripDays: 1,
    holdExpiresAt: new Date(Date.now() + 10 * 60_000),
    ...overrides,
  };
}

function seedTransaction(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: "txn-1", bookingId: "booking-1", referenceNumber: "PAYU-RG1001", gatewayName: "PAYU",
    paymentStatus: "PENDING", amount: "1500.00", vendorId: "vendor-1",
    ...overrides,
  };
}

beforeEach(() => {
  mocks.state.bookings.length = 0;
  mocks.state.transactions.length = 0;
  mocks.state.history.length = 0;
  verifyPaymentServerSide.mockReset();
  findBookingConflict.mockReset().mockResolvedValue(null);
  dispatchRideGridEvent.mockClear();
});

describe("reconcilePayuTransaction", () => {
  it("throws when no PayU transaction matches the txnid", async () => {
    await expect(reconcilePayuTransaction("PAYU-UNKNOWN")).rejects.toBeInstanceOf(PayUTransactionNotFoundError);
  });

  it("confirms the booking and dispatches BOOKING_CREATED + PAYMENT_RECEIVED exactly once on a verified success", async () => {
    mocks.state.bookings.push(seedBooking());
    mocks.state.transactions.push(seedTransaction());
    verifyPaymentServerSide.mockResolvedValue({ txnid: "PAYU-RG1001", status: "success", mihpayid: "mihpay123", amount: "1500.00", mode: "UPI" });

    const result = await reconcilePayuTransaction("PAYU-RG1001");

    expect(result.confirmed).toBe(true);
    expect(result.paymentStatus).toBe("PAID");
    expect(mocks.state.bookings[0].status).toBe("CONFIRMED");
    expect(mocks.state.transactions[0].paymentStatus).toBe("PAID");
    expect(mocks.state.transactions[0].paymentMethod).toBe("UPI");
    expect(dispatchRideGridEvent).toHaveBeenCalledTimes(2);
    expect(dispatchRideGridEvent.mock.calls.map((c) => c[0].type)).toEqual(
      expect.arrayContaining(["BOOKING_CREATED", "PAYMENT_RECEIVED"])
    );
  });

  it("cancels the booking and dispatches nothing on a verified failure", async () => {
    mocks.state.bookings.push(seedBooking());
    mocks.state.transactions.push(seedTransaction());
    verifyPaymentServerSide.mockResolvedValue({ txnid: "PAYU-RG1001", status: "failure", mihpayid: null, amount: null, mode: null });

    const result = await reconcilePayuTransaction("PAYU-RG1001");

    expect(result.confirmed).toBe(false);
    expect(result.paymentStatus).toBe("FAILED");
    expect(mocks.state.bookings[0].status).toBe("CANCELLED");
    expect(dispatchRideGridEvent).not.toHaveBeenCalled();
  });

  it("is idempotent under a duplicate callback+webhook race: only confirms and dispatches once", async () => {
    mocks.state.bookings.push(seedBooking());
    mocks.state.transactions.push(seedTransaction());
    verifyPaymentServerSide.mockResolvedValue({ txnid: "PAYU-RG1001", status: "success", mihpayid: "mihpay123", amount: "1500.00", mode: "UPI" });

    const [first, second] = await Promise.all([
      reconcilePayuTransaction("PAYU-RG1001"),
      reconcilePayuTransaction("PAYU-RG1001"),
    ]);

    const outcomes = [first, second];
    expect(outcomes.filter((r) => !r.alreadyProcessed)).toHaveLength(1);
    expect(mocks.state.bookings[0].status).toBe("CONFIRMED");
    expect(dispatchRideGridEvent).toHaveBeenCalledTimes(2); // BOOKING_CREATED + PAYMENT_RECEIVED, never doubled
  });

  it("a second call after the transaction already settled is a pure no-op (no second verify_payment call)", async () => {
    mocks.state.bookings.push(seedBooking({ status: "CONFIRMED", holdExpiresAt: null }));
    mocks.state.transactions.push(seedTransaction({ paymentStatus: "PAID", gatewayTransactionId: "mihpay123" }));

    const result = await reconcilePayuTransaction("PAYU-RG1001");

    expect(result.alreadyProcessed).toBe(true);
    expect(result.confirmed).toBe(true);
    expect(verifyPaymentServerSide).not.toHaveBeenCalled();
    expect(dispatchRideGridEvent).not.toHaveBeenCalled();
  });

  it("refuses to mark paid and flags refund-required when the vehicle/driver slot was reassigned before a late success arrived", async () => {
    mocks.state.bookings.push(seedBooking());
    mocks.state.transactions.push(seedTransaction());
    verifyPaymentServerSide.mockResolvedValue({ txnid: "PAYU-RG1001", status: "success", mihpayid: "mihpay123", amount: "1500.00", mode: "UPI" });
    findBookingConflict.mockResolvedValue({ vehicleConflict: true, driverConflict: false });

    const result = await reconcilePayuTransaction("PAYU-RG1001");

    expect(result.confirmed).toBe(false);
    expect(result.refundRequired).toBe(true);
    expect(mocks.state.bookings[0].status).toBe("CANCELLED");
    expect(result.paymentStatus).toBe("PAID"); // the money really was captured - refund, don't pretend it wasn't
    expect(dispatchRideGridEvent).not.toHaveBeenCalled();
  });

  it("flags refund-required (never re-confirms) when a verified success arrives for a booking whose hold already expired", async () => {
    mocks.state.bookings.push(seedBooking({ status: "CANCELLED", holdExpiresAt: null }));
    mocks.state.transactions.push(seedTransaction());
    verifyPaymentServerSide.mockResolvedValue({ txnid: "PAYU-RG1001", status: "success", mihpayid: "mihpay123", amount: "1500.00", mode: "UPI" });

    const result = await reconcilePayuTransaction("PAYU-RG1001");

    expect(result.paymentStatus).toBe("PAID");
    expect(result.confirmed).toBe(false);
    expect(result.refundRequired).toBe(true);
    expect(mocks.state.bookings[0].status).toBe("CANCELLED");
    expect(dispatchRideGridEvent).not.toHaveBeenCalled();
  });

  it("rejects (fails, does not confirm) when PayU's reported amount does not match the booking's transaction amount", async () => {
    mocks.state.bookings.push(seedBooking());
    mocks.state.transactions.push(seedTransaction({ amount: "1500.00" }));
    verifyPaymentServerSide.mockResolvedValue({ txnid: "PAYU-RG1001", status: "success", mihpayid: "mihpay123", amount: "5.00", mode: "UPI" });

    const result = await reconcilePayuTransaction("PAYU-RG1001");

    expect(result.confirmed).toBe(false);
    expect(mocks.state.bookings[0].status).toBe("CANCELLED");
    expect(dispatchRideGridEvent).not.toHaveBeenCalled();
  });
});

describe("expireStaleHold", () => {
  it("leaves an unexpired hold untouched", async () => {
    const booking = seedBooking({ holdExpiresAt: new Date(Date.now() + 60_000) });
    mocks.state.bookings.push(booking);

    const expired = await expireStaleHold(booking);

    expect(expired).toBe(false);
    expect(mocks.state.bookings[0].status).toBe("AWAITING_PAYMENT");
  });

  it("cancels a booking whose hold has passed, but leaves its Transaction PENDING so a late success can still be reconciled", async () => {
    const booking = seedBooking({ holdExpiresAt: new Date(Date.now() - 60_000) });
    mocks.state.bookings.push(booking);
    mocks.state.transactions.push(seedTransaction());

    const expired = await expireStaleHold(booking);

    expect(expired).toBe(true);
    expect(mocks.state.bookings[0].status).toBe("CANCELLED");
    expect(mocks.state.transactions[0].paymentStatus).toBe("PENDING");
  });

  it("never blocks availability for a confirmed booking (no-op for non-AWAITING_PAYMENT statuses)", async () => {
    const booking = seedBooking({ status: "CONFIRMED", holdExpiresAt: new Date(Date.now() - 60_000) });
    mocks.state.bookings.push(booking);

    const expired = await expireStaleHold(booking);

    expect(expired).toBe(false);
    expect(mocks.state.bookings[0].status).toBe("CONFIRMED");
  });
});
