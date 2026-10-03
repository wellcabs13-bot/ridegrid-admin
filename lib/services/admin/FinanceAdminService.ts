import { AuditAction, PaymentMethod, PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccountLifecycleError, audit } from "@/lib/services/admin/AccountLifecycleService";
import { bookingRevenue, BookingScope, corporateReceivables, openUnpaid, paymentTotals, Range, totalsOf, vendorPayables } from "@/lib/services/admin/metrics";

// Authoritative operational finance view. Every number is traceable to Booking
// price snapshots, Transaction rows, Corporate Credit wallets or Vendor settlements.

export async function financeSummary(range: Range, scope: BookingScope = {}) {
  const [revenue, payments, unpaid, receivables, payables] = await Promise.all([
    bookingRevenue(range, scope), paymentTotals(range, scope), openUnpaid(scope),
    corporateReceivables(scope.corporateId), vendorPayables(scope.vendorId ? [scope.vendorId] : undefined),
  ]);
  return {
    revenue, payments, unpaid,
    corporate: { outstanding: Math.round(receivables.reduce((s, r) => s + r.outstanding, 0) * 100) / 100, limit: receivables.reduce((s, r) => s + r.creditLimit, 0), accounts: receivables.length },
    vendors: totalsOf(payables),
  };
}

export type TxFilters = { from?: Date; to?: Date; type?: string; status?: string; channel?: string; vendorId?: string; corporateId?: string; q?: string; page?: number; pageSize?: number };

export async function listTransactions(f: TxFilters) {
  const pageSize = Math.min(Math.max(f.pageSize || 25, 5), 5000), page = Math.max(f.page || 1, 1);
  const q = f.q?.trim();
  const where: Prisma.TransactionWhereInput = {
    ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } } : {}),
    ...(f.type && Object.values(TransactionType).includes(f.type as TransactionType) ? { transactionType: f.type as TransactionType } : {}),
    ...(f.status && Object.values(PaymentStatus).includes(f.status as PaymentStatus) ? { paymentStatus: f.status as PaymentStatus } : {}),
    ...(f.channel === "PAYU" ? { gatewayName: "PAYU" } : f.channel === "CORPORATE_CREDIT" ? { paymentMethod: PaymentMethod.CORPORATE_CREDIT } : f.channel === "CASH" ? { paymentMethod: PaymentMethod.CASH } : {}),
    ...(f.vendorId ? { vendorId: f.vendorId } : {}),
    ...(f.corporateId ? { booking: { corporateId: f.corporateId } } : {}),
    ...(q ? { OR: [{ referenceNumber: { contains: q, mode: "insensitive" } }, { gatewayTransactionId: { contains: q, mode: "insensitive" } }, { id: q }, { booking: { bookingNumber: { contains: q, mode: "insensitive" } } }] } : {}),
  };
  const [total, sum, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({ where, _sum: { amount: true } }),
    prisma.transaction.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, transactionType: true, paymentMethod: true, paymentStatus: true, amount: true, referenceNumber: true, gatewayName: true, gatewayTransactionId: true, remarks: true, processedAt: true, createdAt: true,
        vendor: { select: { id: true, companyName: true } },
        booking: { select: { id: true, bookingNumber: true, status: true, taxAmount: true, finalFare: true, deletedAt: true, corporate: { select: { id: true, companyName: true } }, customer: { select: { firstName: true, lastName: true } } } } },
    }),
  ]);
  return {
    rows: rows.map(t => ({
      id: t.id, type: t.transactionType, method: t.paymentMethod, status: t.paymentStatus, amount: Number(t.amount),
      channel: t.paymentMethod === PaymentMethod.CORPORATE_CREDIT ? "Corporate Credit" : t.gatewayName === "PAYU" ? "PayU" : t.paymentMethod === PaymentMethod.CASH ? "Cash" : t.gatewayName ?? "—",
      reference: t.gatewayTransactionId || t.referenceNumber, remarks: t.remarks, processedAt: t.processedAt, createdAt: t.createdAt, vendor: t.vendor,
      booking: t.booking ? { id: t.booking.id, bookingNumber: t.booking.bookingNumber, status: t.booking.status, gst: t.booking.taxAmount == null ? null : Number(t.booking.taxAmount), archived: !!t.booking.deletedAt, company: t.booking.corporate?.companyName ?? null, customer: `${t.booking.customer.firstName} ${t.booking.customer.lastName}`.trim() } : null,
    })),
    total, sum: Number(sum._sum.amount ?? 0), page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function vendorPayableRows() {
  const map = await vendorPayables();
  const vendors = map.size ? await prisma.vendor.findMany({ where: { id: { in: [...map.keys()] } }, select: { id: true, companyName: true, deletedAt: true, suspendedAt: true } }) : [];
  return vendors.map(v => ({ id: v.id, companyName: v.companyName, state: v.deletedAt ? "DELETED" : v.suspendedAt ? "SUSPENDED" : "ACTIVE", ...map.get(v.id)! })).sort((a, b) => b.outstanding - a.outstanding);
}

export async function corporateReceivableRows() {
  const rows = await corporateReceivables();
  const companies = rows.length ? await prisma.corporate.findMany({ where: { id: { in: rows.map(r => r.corporateId) } }, select: { id: true, companyName: true, status: true, paymentTermsDays: true, billingCycle: true } }) : [];
  return rows.map(r => ({ ...r, ...companies.find(c => c.id === r.corporateId)! })).sort((a, b) => b.outstanding - a.outstanding);
}

// A refund recorded as "due" (e.g. after cancelling a PayU-paid booking) is marked
// completed only once Finance confirms the gateway refund reference.
export async function completeRefund(transactionId: string, reference: string, actorId: string) {
  if (!reference.trim()) throw new AccountLifecycleError(400, "Enter the gateway refund reference.");
  const t = await prisma.transaction.findUnique({ where: { id: transactionId }, select: { id: true, transactionType: true, paymentStatus: true, amount: true, bookingId: true } });
  if (!t || t.transactionType !== TransactionType.REFUND) throw new AccountLifecycleError(404, "Refund not found.");
  if (t.paymentStatus !== PaymentStatus.PENDING) throw new AccountLifecycleError(409, "This refund is not pending.");
  await prisma.$transaction(async tx => {
    const claim = await tx.transaction.updateMany({ where: { id: t.id, paymentStatus: PaymentStatus.PENDING }, data: { paymentStatus: PaymentStatus.PAID, gatewayTransactionId: reference.trim(), processedAt: new Date() } });
    if (claim.count !== 1) throw new AccountLifecycleError(409, "This refund changed. Refresh and retry.");
    if (t.bookingId) await tx.booking.update({ where: { id: t.bookingId }, data: { refundAmount: { increment: t.amount } } });
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Transaction", entityId: t.id, newValue: { event: "REFUND_COMPLETED", reference: reference.trim(), amount: Number(t.amount) } });
  });
}
