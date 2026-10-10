import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, bookingRevenue, dailySeries, istStartOfDay, REVENUE_STATUSES } from "@/lib/services/admin/metrics";

// Analytics from real rows only. Empty periods return empty arrays (the UI shows an
// empty state); nothing is interpolated or simulated.

export async function analytics(days: number) {
  const to = addDays(istStartOfDay(), 1), from = addDays(to, -days);
  const statuses = Prisma.join(REVENUE_STATUSES.map(s => Prisma.sql`${s}::"BookingStatus"`));
  const [series, retail, corporate, routes, services, categories, vendors, corporates, repeat, payments, cancelled, all] = await Promise.all([
    dailySeries({ from, to }),
    bookingRevenue({ from, to }, { segment: "RETAIL" }),
    bookingRevenue({ from, to }, { segment: "CORPORATE" }),
    prisma.$queryRaw<{ origin: string | null; destination: string | null; bookings: bigint; value: Prisma.Decimal | null }[]>`
      SELECT b."priceSnapshot"->'route'->>'origin' AS origin, b."priceSnapshot"->'route'->>'destination' AS destination, COUNT(*) AS bookings, SUM(b."finalFare") AS value
      FROM "Booking" b WHERE b."status" IN (${statuses}) AND b."createdAt" >= ${from} AND b."createdAt" < ${to}
      GROUP BY 1, 2 ORDER BY value DESC NULLS LAST LIMIT 10`,
    prisma.$queryRaw<{ service: string | null; bookings: bigint; value: Prisma.Decimal | null }[]>`
      SELECT b."priceSnapshot"->>'service' AS service, COUNT(*) AS bookings, SUM(b."finalFare") AS value
      FROM "Booking" b WHERE b."status" IN (${statuses}) AND b."createdAt" >= ${from} AND b."createdAt" < ${to}
      GROUP BY 1 ORDER BY value DESC NULLS LAST`,
    prisma.$queryRaw<{ category: string; bookings: bigint; value: Prisma.Decimal | null }[]>`
      SELECT v."category"::text AS category, COUNT(*) AS bookings, SUM(b."finalFare") AS value
      FROM "Booking" b JOIN "Vehicle" v ON v."id" = b."vehicleId"
      WHERE b."status" IN (${statuses}) AND b."createdAt" >= ${from} AND b."createdAt" < ${to}
      GROUP BY 1 ORDER BY value DESC NULLS LAST`,
    prisma.booking.groupBy({ by: ["vendorId"], where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to } }, _count: { _all: true }, _sum: { finalFare: true }, orderBy: { _sum: { finalFare: "desc" } }, take: 8 }),
    prisma.booking.groupBy({ by: ["corporateId"], where: { status: { in: REVENUE_STATUSES }, createdAt: { gte: from, lt: to }, corporateId: { not: null } }, _count: { _all: true }, _sum: { finalFare: true }, orderBy: { _sum: { finalFare: "desc" } }, take: 8 }),
    prisma.$queryRaw<{ customers: bigint; repeaters: bigint }[]>`
      SELECT COUNT(*) AS customers, COUNT(*) FILTER (WHERE n > 1) AS repeaters FROM (
        SELECT b."customerId", COUNT(*) AS n FROM "Booking" b WHERE b."status" IN (${statuses}) AND b."createdAt" >= ${from} AND b."createdAt" < ${to} GROUP BY 1) t`,
    prisma.transaction.groupBy({ by: ["paymentStatus"], where: { transactionType: TransactionType.BOOKING_PAYMENT, gatewayName: "PAYU", createdAt: { gte: from, lt: to } }, _count: { _all: true } }),
    prisma.booking.count({ where: { status: "CANCELLED", createdAt: { gte: from, lt: to } } }),
    prisma.booking.count({ where: { status: { in: [...REVENUE_STATUSES, "CANCELLED"] }, createdAt: { gte: from, lt: to } } }),
  ]);
  const [vendorNames, corporateNames] = await Promise.all([
    vendors.length ? prisma.vendor.findMany({ where: { id: { in: vendors.map(v => v.vendorId) } }, select: { id: true, companyName: true } }) : [],
    corporates.length ? prisma.corporate.findMany({ where: { id: { in: corporates.map(c => c.corporateId!) } }, select: { id: true, companyName: true } }) : [],
  ]);
  const num = (v: Prisma.Decimal | bigint | number | null | undefined) => Number(v ?? 0);
  const payu = Object.fromEntries(payments.map(p => [p.paymentStatus, p._count._all])) as Partial<Record<PaymentStatus, number>>;
  const payuAttempts = payments.reduce((s, p) => s + p._count._all, 0);
  const r = repeat[0];
  return {
    period: { from, to, days },
    series,
    segments: { retail: { bookings: retail.bookings, value: retail.bookingValue }, corporate: { bookings: corporate.bookings, value: corporate.bookingValue } },
    routes: routes.map(x => ({ route: x.origin ? `${x.origin}${x.destination && x.destination !== x.origin ? ` → ${x.destination}` : " (local)"}` : "Not recorded", bookings: num(x.bookings), value: num(x.value) })),
    services: services.map(x => ({ service: x.service ?? "Not recorded", bookings: num(x.bookings), value: num(x.value) })),
    categories: categories.map(x => ({ category: x.category, bookings: num(x.bookings), value: num(x.value) })),
    topVendors: vendors.map(v => ({ name: vendorNames.find(n => n.id === v.vendorId)?.companyName ?? v.vendorId, bookings: v._count._all, value: num(v._sum.finalFare) })),
    corporateSpend: corporates.map(c => ({ name: corporateNames.find(n => n.id === c.corporateId)?.companyName ?? String(c.corporateId), bookings: c._count._all, value: num(c._sum.finalFare) })),
    cancellations: { cancelled, total: all, rate: all ? Math.round((cancelled / all) * 1000) / 10 : null },
    repeat: { customers: num(r?.customers), repeaters: num(r?.repeaters), rate: num(r?.customers) ? Math.round((num(r?.repeaters) / num(r?.customers)) * 1000) / 10 : null },
    payu: { attempts: payuAttempts, paid: payu.PAID ?? 0, failed: payu.FAILED ?? 0, pending: payu.PENDING ?? 0, successRate: payuAttempts ? Math.round(((payu.PAID ?? 0) / payuAttempts) * 1000) / 10 : null },
    // Search/visit events are not recorded, so funnel conversion cannot be computed.
    conversion: null,
  };
}
