import { BookingStatus, PaymentStatus, Prisma, SettlementStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Single source of truth for every Super Admin number (Dashboard, Finance, Reports,
// Analytics, Corporate and Vendor views). All values come from Booking price
// snapshots, Transaction rows, Corporate Credit wallets and Vendor settlements.
//
// Definitions:
// - Revenue bookings: CONFIRMED, DRIVER_ASSIGNED, TRIP_STARTED, TRIP_COMPLETED.
//   (PENDING / AWAITING_PAYMENT holds and CANCELLED bookings carry no revenue.)
// - Booking value: Booking.finalFare (the quoted amount payable, incl. GST).
// - GST: Booking.taxAmount (from the pricing snapshot).
// - Platform fee / RideGrid revenue: priceSnapshot.platformFee / .rideGridRevenue.
// - Vendor earning: Booking.vendorEarning (snapshot vendorPayout).
// - Collected: BOOKING_PAYMENT transactions with status PAID.
// - Archived (soft-deleted) bookings stay in financial totals; they are only hidden
//   from operational lists.

export const REVENUE_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED, BookingStatus.DRIVER_ASSIGNED, BookingStatus.TRIP_STARTED, BookingStatus.TRIP_COMPLETED,
];
export const UPCOMING_STATUSES: BookingStatus[] = [BookingStatus.CONFIRMED, BookingStatus.DRIVER_ASSIGNED];

export type Range = { from?: Date; to?: Date };

const n = (value: Prisma.Decimal | number | string | null | undefined) => Number(value ?? 0);
const round = (value: number) => Math.round(value * 100) / 100;

// India (IST) calendar boundaries, returned as UTC instants.
export function istStartOfDay(date = new Date()) {
  const ist = new Date(date.getTime() + 330 * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60_000);
}
export function istStartOfMonth(date = new Date()) {
  const ist = new Date(date.getTime() + 330 * 60_000);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - 330 * 60_000);
}
export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 86_400_000);
}

export function parseRange(params: URLSearchParams): Range {
  const read = (key: string, endOfDay = false) => {
    const value = params.get(key);
    if (!value) return undefined;
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00+05:30` : value);
    if (Number.isNaN(date.getTime())) return undefined;
    return endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value) ? addDays(date, 1) : date;
  };
  return { from: read("from"), to: read("to", true) };
}

export function rangeFilter(range: Range) {
  if (!range.from && !range.to) return undefined;
  return { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lt: range.to } : {}) };
}

export type BookingScope = { vendorId?: string; corporateId?: string; customerId?: string; customerIds?: string[]; segment?: "RETAIL" | "CORPORATE" };

function scopeWhere(scope: BookingScope = {}): Prisma.BookingWhereInput {
  return {
    ...(scope.vendorId ? { vendorId: scope.vendorId } : {}),
    ...(scope.corporateId ? { corporateId: scope.corporateId } : {}),
    ...(scope.customerId ? { customerId: scope.customerId } : {}),
    ...(scope.customerIds ? { customerId: { in: scope.customerIds } } : {}),
    ...(scope.segment === "RETAIL" ? { corporateId: null } : scope.segment === "CORPORATE" ? { corporateId: { not: null } } : {}),
  };
}

function scopeSql(scope: BookingScope = {}, alias = "b") {
  const a = Prisma.raw(`"${alias}"`);
  const parts: Prisma.Sql[] = [];
  if (scope.vendorId) parts.push(Prisma.sql`${a}."vendorId" = ${scope.vendorId}`);
  if (scope.corporateId) parts.push(Prisma.sql`${a}."corporateId" = ${scope.corporateId}`);
  if (scope.customerId) parts.push(Prisma.sql`${a}."customerId" = ${scope.customerId}`);
  if (scope.customerIds) parts.push(scope.customerIds.length ? Prisma.sql`${a}."customerId" IN (${Prisma.join(scope.customerIds)})` : Prisma.sql`FALSE`);
  if (scope.segment === "RETAIL") parts.push(Prisma.sql`${a}."corporateId" IS NULL`);
  if (scope.segment === "CORPORATE") parts.push(Prisma.sql`${a}."corporateId" IS NOT NULL`);
  return parts.length ? Prisma.sql` AND ${Prisma.join(parts, " AND ")}` : Prisma.empty;
}

// Revenue totals for bookings created in a range (by booking creation time).
export async function bookingRevenue(range: Range, scope: BookingScope = {}) {
  const created = rangeFilter(range);
  const where: Prisma.BookingWhereInput = { status: { in: REVENUE_STATUSES }, ...(created ? { createdAt: created } : {}), ...scopeWhere(scope) };
  const statuses = Prisma.join(REVENUE_STATUSES.map(s => Prisma.sql`${s}::"BookingStatus"`));
  const [agg, snapshot] = await Promise.all([
    prisma.booking.aggregate({ where, _count: { _all: true }, _sum: { finalFare: true, taxAmount: true, vendorEarning: true, extraCharges: true, discountAmount: true } }),
    prisma.$queryRaw<{ platformFee: Prisma.Decimal | null; rideGridRevenue: Prisma.Decimal | null; withSnapshot: bigint; total: bigint }[]>`
      SELECT
        SUM(CASE WHEN b."priceSnapshot" ? 'platformFee' THEN (b."priceSnapshot"->>'platformFee')::numeric END) AS "platformFee",
        SUM(CASE WHEN b."priceSnapshot" ? 'rideGridRevenue' THEN (b."priceSnapshot"->>'rideGridRevenue')::numeric END) AS "rideGridRevenue",
        COUNT(*) FILTER (WHERE b."priceSnapshot" ? 'platformFee') AS "withSnapshot",
        COUNT(*) AS "total"
      FROM "Booking" b
      WHERE b."status" IN (${statuses})
        ${range.from ? Prisma.sql`AND b."createdAt" >= ${range.from}` : Prisma.empty}
        ${range.to ? Prisma.sql`AND b."createdAt" < ${range.to}` : Prisma.empty}
        ${scopeSql(scope)}`,
  ]);
  const s = snapshot[0];
  const total = Number(s?.total ?? 0), withSnapshot = Number(s?.withSnapshot ?? 0);
  return {
    bookings: agg._count._all,
    bookingValue: round(n(agg._sum.finalFare)),
    gst: round(n(agg._sum.taxAmount)),
    taxableValue: round(n(agg._sum.finalFare) - n(agg._sum.taxAmount)),
    vendorEarning: round(n(agg._sum.vendorEarning)),
    passThrough: round(n(agg._sum.extraCharges)),
    discounts: round(n(agg._sum.discountAmount)),
    // Only exact when every booking has a pricing snapshot; otherwise flagged.
    platformFee: round(n(s?.platformFee)),
    rideGridRevenue: round(n(s?.rideGridRevenue)),
    snapshotCoverage: { withSnapshot, total, complete: withSnapshot === total },
  };
}

// Payment totals from Transaction rows, by transaction creation time.
export async function paymentTotals(range: Range, scope: BookingScope = {}) {
  const created = rangeFilter(range);
  const bookingScope = scopeWhere(scope);
  const hasScope = Object.keys(bookingScope).length > 0;
  const where: Prisma.TransactionWhereInput = { ...(created ? { createdAt: created } : {}), ...(hasScope ? { booking: bookingScope } : {}) };
  const rows = await prisma.transaction.groupBy({
    by: ["transactionType", "paymentStatus", "paymentMethod"], where, _sum: { amount: true }, _count: { _all: true },
  });
  const sum = (type: TransactionType, status?: PaymentStatus, method?: (m: string) => boolean) =>
    round(rows.filter(r => r.transactionType === type && (!status || r.paymentStatus === status) && (!method || method(r.paymentMethod))).reduce((t, r) => t + n(r._sum.amount), 0));
  const count = (type: TransactionType, status?: PaymentStatus) =>
    rows.filter(r => r.transactionType === type && (!status || r.paymentStatus === status)).reduce((t, r) => t + r._count._all, 0);
  const online = (m: string) => m !== "CASH" && m !== "CORPORATE_CREDIT";
  return {
    collected: sum(TransactionType.BOOKING_PAYMENT, PaymentStatus.PAID),
    collectedOnline: sum(TransactionType.BOOKING_PAYMENT, PaymentStatus.PAID, online),
    collectedCorporateCredit: sum(TransactionType.BOOKING_PAYMENT, PaymentStatus.PAID, m => m === "CORPORATE_CREDIT"),
    collectedCash: sum(TransactionType.BOOKING_PAYMENT, PaymentStatus.PAID, m => m === "CASH"),
    pendingAmount: sum(TransactionType.BOOKING_PAYMENT, PaymentStatus.PENDING),
    pendingCount: count(TransactionType.BOOKING_PAYMENT, PaymentStatus.PENDING),
    failedAmount: sum(TransactionType.BOOKING_PAYMENT, PaymentStatus.FAILED),
    failedCount: count(TransactionType.BOOKING_PAYMENT, PaymentStatus.FAILED),
    refunded: sum(TransactionType.REFUND, PaymentStatus.PAID),
    refundsPending: sum(TransactionType.REFUND, PaymentStatus.PENDING),
    refundsPendingCount: count(TransactionType.REFUND, PaymentStatus.PENDING),
  };
}

// Pending payments that still matter operationally: exclude bookings that were
// cancelled (their unpaid transaction is void, not receivable).
export async function openUnpaid(scope: BookingScope = {}) {
  const agg = await prisma.transaction.aggregate({
    where: {
      transactionType: TransactionType.BOOKING_PAYMENT, paymentStatus: PaymentStatus.PENDING,
      booking: { status: { not: BookingStatus.CANCELLED }, ...scopeWhere(scope) },
    },
    _sum: { amount: true }, _count: { _all: true },
  });
  return { amount: round(n(agg._sum.amount)), count: agg._count._all };
}

export async function corporateReceivables(corporateId?: string) {
  const wallets = await prisma.corporateWallet.findMany({
    where: { ...(corporateId ? { corporateId } : {}), corporate: { deletedAt: null } },
    select: { corporateId: true, balance: true, creditLimit: true, corporate: { select: { creditLimit: true } } },
  });
  return wallets.map(w => {
    const limit = n(w.creditLimit ?? w.corporate.creditLimit);
    const outstanding = n(w.balance);
    return { corporateId: w.corporateId, creditLimit: limit, outstanding, available: Math.max(0, limit - outstanding) };
  });
}

// Vendor payable = vendor earnings on completed trips; paid = completed settlements.
export async function vendorPayables(vendorIds?: string[]) {
  const vendorFilter = vendorIds ? { vendorId: { in: vendorIds } } : {};
  const [earned, paid, processing] = await Promise.all([
    prisma.booking.groupBy({ by: ["vendorId"], where: { ...vendorFilter, status: BookingStatus.TRIP_COMPLETED }, _sum: { vendorEarning: true }, _count: { _all: true } }),
    prisma.vendorSettlement.groupBy({ by: ["vendorId"], where: { ...vendorFilter, settlementStatus: SettlementStatus.COMPLETED }, _sum: { netAmount: true } }),
    prisma.vendorSettlement.groupBy({ by: ["vendorId"], where: { ...vendorFilter, settlementStatus: { in: [SettlementStatus.PENDING, SettlementStatus.PROCESSING] } }, _sum: { netAmount: true } }),
  ]);
  const map = new Map<string, { earned: number; paid: number; inProcess: number; outstanding: number; completedTrips: number }>();
  const get = (id: string) => map.get(id) ?? map.set(id, { earned: 0, paid: 0, inProcess: 0, outstanding: 0, completedTrips: 0 }).get(id)!;
  for (const e of earned) { const v = get(e.vendorId); v.earned = n(e._sum.vendorEarning); v.completedTrips = e._count._all; }
  for (const p of paid) get(p.vendorId).paid = n(p._sum.netAmount);
  for (const p of processing) get(p.vendorId).inProcess = n(p._sum.netAmount);
  for (const v of map.values()) { v.outstanding = round(Math.max(0, v.earned - v.paid)); v.earned = round(v.earned); v.paid = round(v.paid); }
  return map;
}

export function totalsOf(map: Map<string, { earned: number; paid: number; inProcess: number; outstanding: number }>) {
  let earned = 0, paid = 0, inProcess = 0, outstanding = 0;
  for (const v of map.values()) { earned += v.earned; paid += v.paid; inProcess += v.inProcess; outstanding += v.outstanding; }
  return { earned: round(earned), paid: round(paid), inProcess: round(inProcess), outstanding: round(outstanding) };
}

// Daily series for charts (IST days), only from real rows. Days with no data are 0.
export async function dailySeries(range: { from: Date; to: Date }, scope: BookingScope = {}) {
  const statuses = Prisma.join(REVENUE_STATUSES.map(s => Prisma.sql`${s}::"BookingStatus"`));
  const rows = await prisma.$queryRaw<{ day: string; bookings: bigint; value: Prisma.Decimal | null; cancelled: bigint; corporate: bigint }[]>`
    SELECT to_char((b."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE b."status" IN (${statuses})) AS bookings,
      SUM(b."finalFare") FILTER (WHERE b."status" IN (${statuses})) AS value,
      COUNT(*) FILTER (WHERE b."status" = 'CANCELLED') AS cancelled,
      COUNT(*) FILTER (WHERE b."status" IN (${statuses}) AND b."corporateId" IS NOT NULL) AS corporate
    FROM "Booking" b
    WHERE b."createdAt" >= ${range.from} AND b."createdAt" < ${range.to} ${scopeSql(scope)}
    GROUP BY 1 ORDER BY 1`;
  const byDay = new Map(rows.map(r => [r.day, r]));
  const out: { day: string; bookings: number; value: number; cancelled: number; corporate: number; retail: number }[] = [];
  for (let d = istStartOfDay(range.from); d < range.to; d = addDays(d, 1)) {
    const key = new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
    const r = byDay.get(key);
    const bookings = Number(r?.bookings ?? 0), corporate = Number(r?.corporate ?? 0);
    out.push({ day: key, bookings, value: round(n(r?.value)), cancelled: Number(r?.cancelled ?? 0), corporate, retail: bookings - corporate });
  }
  return out;
}
