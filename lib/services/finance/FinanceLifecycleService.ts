import { prisma } from "@/lib/prisma";

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export async function createSettlement(input: {
  vendorId?: string;
  driverId?: string;
  amount: number;
  commission?: number;
  referenceType?: string;
  referenceId?: string;
}) {
  const commission = money(input.commission ?? 0);
  const amount = money(input.amount);
  if (amount <= 0) throw new Error("Settlement amount must be positive.");
  const netAmount = money(amount - commission);
  if (netAmount < 0) throw new Error("Settlement commission exceeds amount.");

  return prisma.financeSettlement.create({
    data: {
      vendorId: input.vendorId,
      driverId: input.driverId,
      amount,
      commission,
      netAmount,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
    },
  });
}

export async function createRefund(input: {
  bookingId?: string;
  transactionId?: string;
  amount: number;
  reason?: string;
}) {
  const amount = money(input.amount);
  if (amount <= 0) throw new Error("Refund amount must be positive.");

  return prisma.financeRefund.create({
    data: {
      bookingId: input.bookingId,
      transactionId: input.transactionId,
      amount,
      reason: input.reason,
    },
  });
}

export async function createPenalty(input: {
  vendorId?: string;
  driverId?: string;
  bookingId?: string;
  amount: number;
  reason: string;
}) {
  const amount = money(input.amount);
  if (amount <= 0) throw new Error("Penalty amount must be positive.");
  if (!input.reason.trim()) throw new Error("Penalty reason is required.");

  return prisma.financePenalty.create({
    data: {
      vendorId: input.vendorId,
      driverId: input.driverId,
      bookingId: input.bookingId,
      amount,
      reason: input.reason.trim(),
    },
  });
}

export async function reconcileFinance(input: {
  sourceType: string;
  sourceId: string;
  expectedAmount: number;
  actualAmount: number;
  notes?: string;
}) {
  const expected = money(input.expectedAmount);
  const actual = money(input.actualAmount);
  const difference = money(actual - expected);

  return prisma.financeReconciliation.create({
    data: {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      expectedAmount: expected,
      actualAmount: actual,
      difference,
      status: difference === 0 ? "MATCHED" : "MISMATCH",
      notes: input.notes,
      reconciledAt: difference === 0 ? new Date() : null,
    },
  });
}