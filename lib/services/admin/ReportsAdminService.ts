import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccountLifecycleError } from "@/lib/services/admin/AccountLifecycleService";
import { listBookings } from "@/lib/services/admin/BookingAdminService";
import { listTransactions } from "@/lib/services/admin/FinanceAdminService";
import { bookingRevenue, dailySeries, istStartOfDay, istStartOfMonth, paymentTotals, Range, REVENUE_STATUSES } from "@/lib/services/admin/metrics";

// Live reports computed from central records (no stored/snapshot report rows).
// Period = booking creation date (IST), the same basis as Finance and Analytics.

export const REPORTS = ["booking", "revenue", "payment", "corporate", "vendor", "vehicle", "driver", "cancellation", "gst"] as const;
export type ReportName = (typeof REPORTS)[number];
type Col = { key: string; title: string; kind?: "money" | "number" | "date" | "text" | "percent" };
type Result = { columns: Col[]; rows: Record<string, unknown>[]; totals?: Record<string, unknown>; total: number; page: number; totalPages: number; note?: string };

const r2 = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;
const created = (range: Range) => (range.from || range.to ? { createdAt: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lt: range.to } : {}) } } : {});
const paged = <T,>(rows: T[], page: number, pageSize: number) => ({ rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, totalPages: Math.max(1, Math.ceil(rows.length / pageSize)) });

async function groupReport(key: "vendorId" | "vehicleId" | "driverId" | "corporateId", range: Range) {
  const nn = key === "driverId" || key === "corporateId" ? { [key]: { not: null } } : {};
  const [all, done, cancelled] = await Promise.all([
    prisma.booking.groupBy({ by: [key], where: { ...created(range), status: { in: REVENUE_STATUSES }, ...nn }, _count: { _all: true }, _sum: { finalFare: true, taxAmount: true, vendorEarning: true, tripDays: true } }),
    prisma.booking.groupBy({ by: [key], where: { ...created(range), status: BookingStatus.TRIP_COMPLETED, ...nn }, _count: { _all: true } }),
    prisma.booking.groupBy({ by: [key], where: { ...created(range), status: BookingStatus.CANCELLED, ...nn }, _count: { _all: true } }),
  ]);
  const ids = [...new Set([...all, ...cancelled].map(g => (g as Record<string, unknown>)[key] as string))];
  return { all, done, cancelled, ids, get: (rows: { _count: { _all: number } }[], id: string) => (rows as unknown as Record<string, unknown>[]).find(r => r[key] === id) as { _count: { _all: number }; _sum?: Record<string, unknown> } | undefined };
}

export async function runReport(name: ReportName, range: Range, filters: Record<string, string | undefined>, page = 1, pageSize = 50): Promise<Result> {
  switch (name) {
    case "booking": {
      const r = await listBookings({ from: range.from, to: range.to, dateField: "created", status: filters.status, source: filters.source, segment: filters.segment, vendorId: filters.vendorId, corporateId: filters.corporateId, page, pageSize });
      return { ...r, columns: [{ key: "bookingNumber", title: "Booking" }, { key: "createdAt", title: "Booked", kind: "date" }, { key: "sourceLabel", title: "Source" }, { key: "status", title: "Status" }, { key: "customerName", title: "Customer" }, { key: "company", title: "Company" }, { key: "vendorName", title: "Vendor" }, { key: "vehicle", title: "Vehicle" }, { key: "pickupDateTime", title: "Pickup", kind: "date" }, { key: "paymentStatus", title: "Payment" }, { key: "gst", title: "GST", kind: "money" }, { key: "total", title: "Total", kind: "money" }],
        rows: r.rows.map(b => ({ bookingNumber: b.bookingNumber, createdAt: b.createdAt, sourceLabel: b.sourceLabel, status: b.status, customerName: b.customer.name, company: b.corporate?.companyName ?? "", vendorName: b.vendor.companyName, vehicle: `${b.vehicle.label} ${b.vehicle.registrationNumber}`, pickupDateTime: b.pickupDateTime, paymentStatus: b.payment?.status ?? "", gst: b.fare.gst, total: b.fare.total })) };
    }
    case "revenue": {
      const today = istStartOfDay();
      const from = range.from ?? istStartOfMonth(), to = range.to ?? new Date(today.getTime() + 86_400_000);
      if (to.getTime() - from.getTime() > 400 * 86_400_000) throw new AccountLifecycleError(400, "Choose a period of at most 400 days for the daily revenue report.");
      const [series, totals] = await Promise.all([dailySeries({ from, to }), bookingRevenue({ from, to })]);
      const rows = series.slice().reverse();
      return { ...paged(rows, page, pageSize), columns: [{ key: "day", title: "Day" }, { key: "bookings", title: "Bookings", kind: "number" }, { key: "retail", title: "Retail", kind: "number" }, { key: "corporate", title: "Corporate", kind: "number" }, { key: "cancelled", title: "Cancelled", kind: "number" }, { key: "value", title: "Booking value", kind: "money" }],
        totals: { bookings: totals.bookings, value: totals.bookingValue, gst: totals.gst, platformFee: totals.platformFee, vendorEarning: totals.vendorEarning }, note: range.from ? undefined : "Defaults to the current month when no dates are selected." };
    }
    case "payment": {
      const r = await listTransactions({ ...range, type: filters.type, status: filters.status, channel: filters.channel, vendorId: filters.vendorId, corporateId: filters.corporateId, page, pageSize });
      return { ...r, columns: [{ key: "createdAt", title: "Created", kind: "date" }, { key: "type", title: "Type" }, { key: "channel", title: "Channel" }, { key: "status", title: "Status" }, { key: "bookingNumber", title: "Booking" }, { key: "reference", title: "Reference" }, { key: "amount", title: "Amount", kind: "money" }],
        rows: r.rows.map(t => ({ createdAt: t.createdAt, type: t.type, channel: t.channel, status: t.status, bookingNumber: t.booking?.bookingNumber ?? "", reference: t.reference ?? "", amount: t.amount })), totals: { ...(await paymentTotals(range, { vendorId: filters.vendorId, corporateId: filters.corporateId })), matchingSum: r.sum } };
    }
    case "corporate": case "vendor": case "vehicle": case "driver": {
      const key = ({ corporate: "corporateId", vendor: "vendorId", vehicle: "vehicleId", driver: "driverId" } as const)[name];
      const g = await groupReport(key, range);
      const names = new Map<string, string>();
      if (name === "corporate") (await prisma.corporate.findMany({ where: { id: { in: g.ids } }, select: { id: true, companyName: true, gstNumber: true } })).forEach(c => names.set(c.id, `${c.companyName}${c.gstNumber ? ` (${c.gstNumber})` : ""}`));
      if (name === "vendor") (await prisma.vendor.findMany({ where: { id: { in: g.ids } }, select: { id: true, companyName: true } })).forEach(v => names.set(v.id, v.companyName));
      if (name === "vehicle") (await prisma.vehicle.findMany({ where: { id: { in: g.ids } }, select: { id: true, registrationNumber: true, make: true, model: true, vendor: { select: { companyName: true } } } })).forEach(v => names.set(v.id, `${v.registrationNumber} · ${v.make} ${v.model} (${v.vendor.companyName})`));
      if (name === "driver") (await prisma.driver.findMany({ where: { id: { in: g.ids } }, select: { id: true, firstName: true, lastName: true } })).forEach(d => names.set(d.id, `${d.firstName} ${d.lastName}`.trim()));
      const days = range.from && range.to ? Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / 86_400_000)) : null;
      const rows = g.ids.map(id => {
        const a = g.get(g.all, id), s = (a?._sum ?? {}) as Record<string, unknown>;
        const bookings = a?._count._all ?? 0, bookedDays = Number(s.tripDays ?? 0);
        return { name: names.get(id) ?? id, bookings, completed: g.get(g.done, id)?._count._all ?? 0, cancelled: g.get(g.cancelled, id)?._count._all ?? 0, value: r2(s.finalFare), gst: r2(s.taxAmount), vendorEarning: r2(s.vendorEarning), bookedDays, utilization: days && name === "vehicle" ? Math.round((bookedDays / days) * 1000) / 10 : null };
      }).sort((x, y) => y.value - x.value);
      const cols: Col[] = [{ key: "name", title: name === "corporate" ? "Company" : name === "vendor" ? "Vendor" : name === "vehicle" ? "Vehicle" : "Driver" }, { key: "bookings", title: "Bookings", kind: "number" }, { key: "completed", title: "Completed", kind: "number" }, { key: "cancelled", title: "Cancelled", kind: "number" }, { key: "value", title: "Booking value", kind: "money" }];
      if (name === "corporate") cols.push({ key: "gst", title: "GST", kind: "money" });
      if (name === "vendor") cols.push({ key: "vendorEarning", title: "Vendor share", kind: "money" });
      if (name === "vehicle") cols.push({ key: "bookedDays", title: "Booked days", kind: "number" }, { key: "utilization", title: "Utilisation", kind: "percent" });
      return { ...paged(rows, page, pageSize), columns: cols, note: name === "vehicle" && !days ? "Select a From and To date to calculate utilisation (booked days ÷ days in period)." : undefined };
    }
    case "cancellation": {
      const where: Prisma.BookingWhereInput = { ...created(range), status: BookingStatus.CANCELLED };
      const [total, rows] = await Promise.all([
        prisma.booking.count({ where }),
        prisma.booking.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { bookingNumber: true, createdAt: true, cancelledAt: true, cancelReason: true, finalFare: true, refundAmount: true, corporate: { select: { companyName: true } }, vendor: { select: { companyName: true } }, statusHistory: { where: { currentStatus: BookingStatus.CANCELLED }, take: 1, select: { previousStatus: true } } } }),
      ]);
      return { columns: [{ key: "bookingNumber", title: "Booking" }, { key: "createdAt", title: "Booked", kind: "date" }, { key: "cancelledAt", title: "Cancelled", kind: "date" }, { key: "stage", title: "Cancelled from" }, { key: "reason", title: "Reason" }, { key: "company", title: "Company" }, { key: "vendor", title: "Vendor" }, { key: "fare", title: "Fare", kind: "money" }, { key: "refund", title: "Refunded", kind: "money" }],
        rows: rows.map(b => ({ bookingNumber: b.bookingNumber, createdAt: b.createdAt, cancelledAt: b.cancelledAt, stage: b.statusHistory[0]?.previousStatus ?? "", reason: b.cancelReason ?? "", company: b.corporate?.companyName ?? "", vendor: b.vendor.companyName, fare: r2(b.finalFare), refund: r2(b.refundAmount) })), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
    }
    case "gst": {
      const where: Prisma.BookingWhereInput = { ...created(range), status: { in: REVENUE_STATUSES } };
      const [total, agg, rows] = await Promise.all([
        prisma.booking.count({ where }), prisma.booking.aggregate({ where, _sum: { taxAmount: true, finalFare: true } }),
        prisma.booking.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { bookingNumber: true, createdAt: true, finalFare: true, taxAmount: true, priceSnapshot: true, corporate: { select: { companyName: true, gstNumber: true } }, customer: { select: { firstName: true, lastName: true } } } }),
      ]);
      return { columns: [{ key: "bookingNumber", title: "Booking" }, { key: "createdAt", title: "Date", kind: "date" }, { key: "party", title: "Billed to" }, { key: "gstin", title: "Customer GSTIN" }, { key: "taxable", title: "Taxable value", kind: "money" }, { key: "rates", title: "GST rate(s)" }, { key: "gst", title: "GST", kind: "money" }, { key: "total", title: "Invoice total", kind: "money" }],
        rows: rows.map(b => {
          const comps = ((b.priceSnapshot as { taxComponents?: { name: string; rate: string; taxableAmount: string }[] } | null)?.taxComponents ?? []);
          return { bookingNumber: b.bookingNumber, createdAt: b.createdAt, party: b.corporate?.companyName ?? `${b.customer.firstName} ${b.customer.lastName}`.trim(), gstin: b.corporate?.gstNumber ?? "", taxable: comps.length ? r2(comps.reduce((s, c) => s + Number(c.taxableAmount), 0)) : null, rates: comps.map(c => `${c.name} ${c.rate}%`).join(", ") || "Not available", gst: r2(b.taxAmount), total: r2(b.finalFare) };
        }), totals: { gst: r2(agg._sum.taxAmount), total: r2(agg._sum.finalFare) }, total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)),
        note: "Taxable value and rates come from each booking's pricing snapshot; bookings without a snapshot show “Not available”." };
    }
  }
}
