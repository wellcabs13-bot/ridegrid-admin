import { NextRequest } from "next/server";
import { BookingStatus, PaymentStatus, Prisma, TripStatus, VehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { corporateTravelPolicyService, indiaPeriods, policyCategories, policyCities } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { APPROVER_LABEL, APPROVER_TYPES, corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { getCorporateCreditAccount } from "@/lib/services/corporate/CorporateCreditService";
import { budgetBookingWhere, budgetScope } from "@/lib/services/corporate/CorporateBudgetService";
import { trustedTripLocation } from "@/lib/services/booking/TrustedLocationService";
import { serviceOf } from "@/lib/corporate-employee-mobile/selects";
import type { ApprovalRequestSnapshot } from "@/lib/services/corporate/CorporateApprovalService";
import { AdminAccess, CorporateAdminError, id as idOf, pageOf } from "./access";
import { adminApproval, adminApprovalSelect, adminBooking, adminBookingSelect, employeeOf, employeeSummarySelect } from "./selects";
import { commercial } from "./documents";
import { notificationCenter } from "./notification-center";
import { support } from "./support";

const PAGE = 20;
const LIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"];
const OPEN_INVOICE: PaymentStatus[] = ["PENDING", "PARTIAL"];
const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

// Every read is anchored to the administrator's own company. Archived (hidden) bookings
// stay in finance, billing and reports; only the active booking list hides them.
export const companyBookings = (a: AdminAccess): Prisma.BookingWhereInput => ({ corporateId: a.corporateId, deletedAt: null });
const fare = (b: { finalFare: Prisma.Decimal | null; estimatedFare: Prisma.Decimal }) => b.finalFare ?? b.estimatedFare;
const dec = (v: Prisma.Decimal.Value | null | undefined) => new Prisma.Decimal(v ?? 0).toFixed(2);
const zero = () => new Prisma.Decimal(0);

function param(request: NextRequest, name: string) {
  const v = request.nextUrl.searchParams.get(name);
  return v && v.trim() ? v.trim() : null;
}

// Calendar dates are interpreted in India time, matching the travel policy service.
export function istDate(value: string | null, name: string, endOfDay = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CorporateAdminError(400, `Invalid ${name}.`);
  const d = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) throw new CorporateAdminError(400, `Invalid ${name}.`);
  return endOfDay ? new Date(d.getTime() + 86400000) : d;
}

const monthKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(d);
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

// Resolves organisation filters, rejecting identifiers that belong to another company.
export async function orgFilter(request: NextRequest, a: AdminAccess) {
  const employeeId = param(request, "employeeId"), branchId = param(request, "branchId"), departmentId = param(request, "departmentId");
  const [employee, branch, department] = await Promise.all([
    employeeId ? prisma.corporateEmployee.findFirst({ where: { id: idOf(employeeId, "employee"), corporateId: a.corporateId }, select: { id: true, userId: true } }) : null,
    branchId ? prisma.corporateBranch.findFirst({ where: { id: idOf(branchId, "branch"), corporateId: a.corporateId }, select: { id: true } }) : null,
    departmentId ? prisma.corporateDepartment.findFirst({ where: { id: idOf(departmentId, "department"), corporateId: a.corporateId }, select: { id: true } }) : null,
  ]);
  if ((employeeId && !employee) || (branchId && !branch) || (departmentId && !department)) throw new CorporateAdminError(404, "Filter not found.");
  const traveller: Prisma.CorporateEmployeeWhereInput = { corporateId: a.corporateId, ...(branch ? { branchId: branch.id } : {}), ...(department ? { departmentId: department.id } : {}) };
  const where: Prisma.BookingWhereInput = {};
  if (employee) where.customer = { userId: employee.userId ?? "__no_login__" };
  else if (branch || department) where.customer = { user: { corporateEmployee: { is: traveller } } };
  return where;
}

function serviceFilter(service: string | null): Prisma.BookingWhereInput {
  const local: Prisma.BookingWhereInput = { pricingPackage: { is: { packageType: { startsWith: "LOCAL" } } } };
  const airport: Prisma.BookingWhereInput = { pricingPackage: { is: { packageType: { startsWith: "AIRPORT" } } } };
  if (!service) return {};
  if (service === "LOCAL") return local;
  if (service === "AIRPORT") return airport;
  if (service === "ONE_WAY") return { tripType: "ONEWAY", NOT: [local, airport] };
  if (service === "ROUNDTRIP") return { tripType: "ROUNDTRIP", NOT: local };
  throw new CorporateAdminError(400, "Invalid service.");
}

async function approvalsByBooking(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; status: string }>();
  const rows = await prisma.corporateApprovalRequest.findMany({ where: { bookingId: { in: ids } }, select: { id: true, status: true, bookingId: true } });
  return new Map(rows.map((r) => [r.bookingId!, { id: r.id, status: r.status }]));
}

// Booking list tabs map onto central booking states.
const VIEW: Record<string, Prisma.BookingWhereInput> = {
  upcoming: { status: { in: LIVE_STATUSES } },
  ongoing: { status: "TRIP_STARTED" },
  completed: { status: "TRIP_COMPLETED" },
  cancelled: { status: "CANCELLED" },
};

async function bookingWhere(request: NextRequest, a: AdminAccess) {
  const status = param(request, "status"), tripStatus = param(request, "tripStatus"), approval = param(request, "approval");
  const vendorId = param(request, "vendorId"), paymentStatus = param(request, "paymentStatus"), view = param(request, "view");
  const q = param(request, "q");
  if (status && !(status in BookingStatus)) throw new CorporateAdminError(400, "Invalid booking status.");
  if (tripStatus && !(tripStatus in TripStatus)) throw new CorporateAdminError(400, "Invalid trip status.");
  if (paymentStatus && !(paymentStatus in PaymentStatus)) throw new CorporateAdminError(400, "Invalid payment status.");
  if (approval && !["REQUIRED", "DIRECT"].includes(approval)) throw new CorporateAdminError(400, "Invalid approval filter.");
  if (view && !(view in VIEW) && view !== "archived" && view !== "all") throw new CorporateAdminError(400, "Invalid view.");
  const from = istDate(param(request, "from"), "start date"), to = istDate(param(request, "to"), "end date", true);
  const and: Prisma.BookingWhereInput[] = [companyBookings(a), await orgFilter(request, a), serviceFilter(param(request, "service"))];
  and.push(view === "archived" ? { corporateArchivedAt: { not: null } } : view === "all" ? {} : { corporateArchivedAt: null });
  if (view && VIEW[view]) and.push(VIEW[view]);
  if (status) and.push({ status: status as BookingStatus });
  if (param(request, "when") === "upcoming") and.push({ status: { in: LIVE_STATUSES }, pickupDateTime: { gte: new Date() } });
  if (tripStatus) and.push({ trip: { is: { status: tripStatus as TripStatus, deletedAt: null } } });
  if (vendorId) and.push({ vendorId: idOf(vendorId, "vendor") });
  // Corporate bookings are paid only by corporate credit; the state filter reads that transaction.
  if (paymentStatus) and.push({ transactions: { some: { paymentMethod: "CORPORATE_CREDIT", paymentStatus: paymentStatus as PaymentStatus } } });
  if (from || to) and.push({ pickupDateTime: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } });
  if (q) and.push({ OR: [{ bookingNumber: { contains: q.slice(0, 60), mode: "insensitive" } }, { customer: { user: { corporateEmployee: { is: { employeeName: { contains: q.slice(0, 60), mode: "insensitive" } } } } } }] });
  if (approval) {
    const linked = await prisma.corporateApprovalRequest.findMany({ where: { corporateId: a.corporateId, bookingId: { not: null } }, select: { bookingId: true }, take: 10000 });
    const ids = linked.map((r) => r.bookingId!);
    and.push(approval === "REQUIRED" ? { id: { in: ids } } : { id: { notIn: ids } });
  }
  return { AND: and } satisfies Prisma.BookingWhereInput;
}

async function bookings(request: NextRequest, a: AdminAccess) {
  const bookingId = param(request, "id");
  if (bookingId) return bookingDetail(idOf(bookingId, "booking"), a);
  const n = pageOf(request);
  const where = await bookingWhere(request, a);
  const active = { ...companyBookings(a), corporateArchivedAt: null };
  const [rows, total, vendors, counts, archived, pendingApprovals] = await Promise.all([
    prisma.booking.findMany({ where, select: adminBookingSelect, orderBy: [{ pickupDateTime: "desc" }, { id: "asc" }], skip: (n - 1) * PAGE, take: PAGE }),
    prisma.booking.count({ where }),
    n === 1 ? prisma.vendor.findMany({ where: { bookings: { some: companyBookings(a) } }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" }, take: 200 }) : null,
    n === 1 ? prisma.booking.groupBy({ by: ["status"], where: active, _count: { _all: true } }) : null,
    n === 1 ? prisma.booking.count({ where: { ...companyBookings(a), corporateArchivedAt: { not: null } } }) : null,
    n === 1 ? prisma.corporateApprovalRequest.groupBy({ by: ["status"], where: { corporateId: a.corporateId, bookingId: null, status: { in: ["PENDING", "APPROVED", "REJECTED"] } }, _count: { _all: true } }) : null,
  ]);
  const approvals = await approvalsByBooking(rows.map((r) => r.id));
  const byStatus = counts ? Object.fromEntries(counts.map((c) => [c.status, c._count._all])) : null;
  const requests = pendingApprovals ? Object.fromEntries(pendingApprovals.map((c) => [c.status, c._count._all])) : null;
  return {
    items: rows.map((r) => adminBooking(r, a.corporateId, approvals.get(r.id))), page: n, pageSize: PAGE, total, vendors,
    // Requests are approval records; they become bookings only when the employee books the approved ride.
    counts: byStatus && requests ? {
      requestsPending: requests.PENDING ?? 0, requestsApproved: requests.APPROVED ?? 0, requestsRejected: requests.REJECTED ?? 0,
      upcoming: LIVE_STATUSES.reduce((s, k) => s + (byStatus[k] ?? 0), 0), ongoing: byStatus.TRIP_STARTED ?? 0,
      completed: byStatus.TRIP_COMPLETED ?? 0, cancelled: byStatus.CANCELLED ?? 0, archived: archived ?? 0,
    } : null,
  };
}

async function bookingDetail(bookingId: string, a: AdminAccess) {
  const b = await prisma.booking.findFirst({
    where: { ...companyBookings(a), id: bookingId },
    select: {
      ...adminBookingSelect,
      reservedFrom: true, reservedUntil: true, cancelReason: true, cancelledAt: true,
      trip: { select: { status: true, deletedAt: true, driverAssignedAt: true, driverAcceptedAt: true, arrivedPickupAt: true, passengerBoardedAt: true, tripStartedAt: true, tripCompletedAt: true, cancelledAt: true } },
      statusHistory: { select: { previousStatus: true, currentStatus: true, action: true, remarks: true, changedAt: true }, orderBy: { changedAt: "asc" }, take: 100 },
      invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, taxAmount: true, paymentStatus: true, invoiceDate: true, dueDate: true } },
    },
  });
  if (!b) throw new CorporateAdminError(404, "Booking not found.");
  const approvalRow = await prisma.corporateApprovalRequest.findFirst({ where: { bookingId: b.id, corporateId: a.corporateId }, select: adminApprovalSelect });
  const location = await trustedTripLocation(b.id, b);
  const trip = b.trip && !b.trip.deletedAt ? b.trip : null;
  const editable = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"].includes(b.status) && b.pickupDateTime.getTime() > Date.now();
  return {
    ...adminBooking(b, a.corporateId, approvalRow ? { id: approvalRow.id, status: approvalRow.status } : null),
    reservedFrom: b.reservedFrom, reservedUntil: b.reservedUntil, cancelReason: b.cancelReason, cancelledAt: b.cancelledAt,
    trip: trip ? { ...trip, deletedAt: undefined } : null,
    timeline: b.statusHistory,
    approvalRequest: approvalRow ? adminApproval(approvalRow, await approverNames([approvalRow])) : null,
    invoice: b.invoice ? { ...b.invoice, totalAmount: dec(b.invoice.totalAmount), taxAmount: dec(b.invoice.taxAmount), downloadUrl: `/api/corporate-admin/documents/invoice?id=${encodeURIComponent(b.invoice.id)}` } : null,
    // Only a fresh, attested Driver App position is shown; no location history leaves the server.
    liveLocation: location,
    actions: {
      edit: editable, cancel: editable || b.status === "PENDING",
      archive: !b.corporateArchivedAt && ["CANCELLED", "TRIP_COMPLETED"].includes(b.status), restore: !!b.corporateArchivedAt,
    },
  };
}

async function approverNames(rows: { steps: { approverId: string | null }[] }[]) {
  const ids = [...new Set(rows.flatMap((r) => r.steps.map((s) => s.approverId).filter((x): x is string => !!x)))];
  if (!ids.length) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

async function approvals(request: NextRequest, a: AdminAccess) {
  const requestId = param(request, "id");
  if (requestId) {
    const r = await prisma.corporateApprovalRequest.findFirst({ where: { id: idOf(requestId, "request"), corporateId: a.corporateId }, select: adminApprovalSelect });
    if (!r) throw new CorporateAdminError(404, "Approval request not found.");
    const [booking, names, history] = await Promise.all([
      r.bookingId ? prisma.booking.findFirst({ where: { ...companyBookings(a), id: r.bookingId }, select: { id: true, bookingNumber: true, status: true } }) : null,
      approverNames([r]),
      prisma.auditLog.findMany({ where: { entityName: "CorporateApprovalRequest", entityId: r.id }, select: { action: true, newValue: true, createdAt: true, user: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 50 }),
    ]);
    const view = adminApproval(r, names, booking);
    return {
      ...view,
      // The workflow copied onto this request when it was submitted.
      workflow: view.steps.map((s) => ({ level: s.level, stage: s.stage, approverDesignation: s.assignedTo })),
      history: history.map((h) => ({ at: h.createdAt, by: h.user?.name ?? "RideGrid", detail: h.newValue })),
    };
  }
  const status = param(request, "status"), q = param(request, "q");
  if (status && !APPROVAL_STATUSES.includes(status)) throw new CorporateAdminError(400, "Invalid status.");
  const n = pageOf(request);
  const where: Prisma.CorporateApprovalRequestWhereInput = {
    corporateId: a.corporateId, ...(status ? { status } : {}),
    ...(q ? { employee: { OR: [{ employeeName: { contains: q.slice(0, 60), mode: "insensitive" } }, { employeeCode: { contains: q.slice(0, 60), mode: "insensitive" } }] } } : {}),
  };
  const [rows, total, counts] = await Promise.all([
    prisma.corporateApprovalRequest.findMany({ where, select: adminApprovalSelect, orderBy: [{ submittedAt: "desc" }, { id: "desc" }], skip: (n - 1) * PAGE, take: PAGE }),
    prisma.corporateApprovalRequest.count({ where }),
    prisma.corporateApprovalRequest.groupBy({ by: ["status"], where: { corporateId: a.corporateId }, _count: { _all: true } }),
  ]);
  const names = await approverNames(rows);
  return { items: rows.map((r) => adminApproval(r, names)), page: n, pageSize: PAGE, total, counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])) };
}

// Authoritative money position for a set of company bookings: spend from bookings,
// billed/paid/outstanding from issued invoices, unbilled = completed trips without an invoice.
export async function financeSummary(a: AdminAccess, range: Prisma.BookingWhereInput = {}) {
  const base: Prisma.BookingWhereInput = { ...companyBookings(a), ...range };
  const now = new Date();
  const inv = (extra: Prisma.InvoiceWhereInput = {}): Prisma.InvoiceWhereInput => ({ booking: base, ...extra });
  const [spend, completed, billed, byStatus, overdue, due, unbilled] = await Promise.all([
    prisma.booking.aggregate({ where: { ...base, status: { not: "CANCELLED" } }, _sum: { finalFare: true, taxAmount: true }, _count: { _all: true } }),
    prisma.booking.aggregate({ where: { ...base, status: "TRIP_COMPLETED" }, _sum: { finalFare: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: inv(), _sum: { totalAmount: true, taxAmount: true, subtotal: true }, _count: { _all: true } }),
    prisma.invoice.groupBy({ by: ["paymentStatus"], where: inv(), _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: inv({ paymentStatus: { in: OPEN_INVOICE }, dueDate: { lt: now } }), _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.invoice.aggregate({ where: inv({ paymentStatus: { in: OPEN_INVOICE }, OR: [{ dueDate: { gte: now } }, { dueDate: null }] }), _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.booking.aggregate({ where: { ...base, status: "TRIP_COMPLETED", invoice: { is: null } }, _sum: { finalFare: true }, _count: { _all: true } }),
  ]);
  const status = (s: PaymentStatus) => byStatus.find((r) => r.paymentStatus === s);
  const outstanding = OPEN_INVOICE.reduce((sum, s) => sum.plus(status(s)?._sum.totalAmount ?? 0), zero());
  const nextDue = await prisma.invoice.findFirst({ where: inv({ paymentStatus: { in: OPEN_INVOICE }, dueDate: { gte: now } }), select: { dueDate: true }, orderBy: { dueDate: "asc" } });
  return {
    spend: dec(spend._sum.finalFare), bookings: spend._count._all, bookedTax: dec(spend._sum.taxAmount),
    completedSpend: dec(completed._sum.finalFare), completedTrips: completed._count._all,
    billed: dec(billed._sum.totalAmount), invoices: billed._count._all, invoiceTax: dec(billed._sum.taxAmount), invoiceTaxable: dec(billed._sum.subtotal),
    paid: dec(status("PAID")?._sum.totalAmount), paidInvoices: status("PAID")?._count._all ?? 0,
    outstanding: dec(outstanding), outstandingInvoices: OPEN_INVOICE.reduce((n, s) => n + (status(s)?._count._all ?? 0), 0),
    partialInvoices: status("PARTIAL")?._count._all ?? 0,
    due: dec(due._sum.totalAmount), dueInvoices: due._count._all,
    overdue: dec(overdue._sum.totalAmount), overdueInvoices: overdue._count._all,
    unbilled: dec(unbilled._sum.finalFare), unbilledTrips: unbilled._count._all,
    nextDueDate: nextDue?.dueDate ?? null,
  };
}

type BudgetRecord = Prisma.CorporateBudgetGetPayload<{ select: typeof budgetRecordSelect }>;
const budgetRecordSelect = {
  id: true, corporateId: true, budgetName: true, period: true, status: true, allocatedAmount: true, utilizedAmount: true, alertThreshold: true,
  startDate: true, endDate: true, updatedAt: true, branchId: true, departmentId: true, employeeId: true,
  branch: { select: { branchName: true } }, department: { select: { departmentName: true, branchId: true } },
  employee: { select: { employeeName: true, employeeCode: true, userId: true, branchId: true, departmentId: true } },
} satisfies Prisma.CorporateBudgetSelect;

// Used = completed trips, committed = booked and not yet completed, pending = approval
// requests awaiting a decision. Remaining = allocated - used - committed.
async function budgetUsage(b: BudgetRecord, pending: { amount: Prisma.Decimal; pickup: Date; employeeId: string; branchId: string | null; departmentId: string | null }[]) {
  const grouped = await prisma.booking.groupBy({ by: ["status"], where: budgetBookingWhere(b, b.employee?.userId), _sum: { finalFare: true } });
  const used = grouped.filter((g) => g.status === "TRIP_COMPLETED").reduce((s, g) => s.plus(g._sum.finalFare ?? 0), zero());
  const committed = grouped.filter((g) => g.status !== "TRIP_COMPLETED").reduce((s, g) => s.plus(g._sum.finalFare ?? 0), zero());
  const inScope = pending.filter((p) => p.pickup >= b.startDate && p.pickup <= b.endDate
    && (!b.employeeId || p.employeeId === b.employeeId) && (!b.departmentId || p.departmentId === b.departmentId) && (!b.branchId || p.branchId === b.branchId));
  const pendingAmount = inScope.reduce((s, p) => s.plus(p.amount), zero());
  const remaining = Prisma.Decimal.max(b.allocatedAmount.minus(used).minus(committed), 0);
  const pct = b.allocatedAmount.gt(0) ? used.plus(committed).div(b.allocatedAmount).times(100).toNumber() : 0;
  return {
    id: b.id, budgetName: b.budgetName, period: b.period, status: b.status, scope: budgetScope(b),
    scopeName: b.employee?.employeeName ?? b.department?.departmentName ?? b.branch?.branchName ?? "Company",
    branchId: b.branchId, departmentId: b.departmentId, employeeId: b.employeeId,
    allocatedAmount: dec(b.allocatedAmount), used: dec(used), committed: dec(committed), pending: dec(pendingAmount), pendingRequests: inScope.length,
    bookedSpend: dec(used.plus(committed)), remaining: dec(remaining), utilisation: Math.round(pct * 10) / 10,
    alertThreshold: b.alertThreshold?.toFixed(2) ?? null, alert: !!b.alertThreshold && pct >= b.alertThreshold.toNumber(),
    startDate: b.startDate, endDate: b.endDate, updatedAt: b.updatedAt,
  };
}

async function pendingApprovalAmounts(a: AdminAccess) {
  const rows = await prisma.corporateApprovalRequest.findMany({ where: { corporateId: a.corporateId, status: "PENDING" }, select: { amount: true, requestSnapshot: true, employeeId: true, employee: { select: { branchId: true, departmentId: true } } }, take: 2000 });
  return rows.flatMap((r) => {
    const s = r.requestSnapshot as unknown as ApprovalRequestSnapshot | null;
    const pickup = s ? new Date(s.pickupDateTime) : null;
    return r.amount && pickup && !Number.isNaN(pickup.getTime()) ? [{ amount: r.amount, pickup, employeeId: r.employeeId, branchId: r.employee.branchId, departmentId: r.employee.departmentId }] : [];
  });
}

async function dashboard(a: AdminAccess) {
  const now = new Date();
  const p = indiaPeriods(now);
  const base = companyBookings(a);
  const todayStart = new Date(`${dayKey(now)}T00:00:00+05:30`), todayEnd = new Date(todayStart.getTime() + 86400000);
  const month = { ...base, pickupDateTime: { gte: p.monthStart, lt: p.monthEnd } };
  const [employees, activeEmployees, branchCount, departmentCount, approvalCounts, pending, statusCounts, today, upcoming, monthCount, monthSpend, upcomingList, activeList, recent, credit, budgetRows, pendingAmounts, finance, unread, recentRequests] = await Promise.all([
    prisma.corporateEmployee.count({ where: { corporateId: a.corporateId } }),
    prisma.corporateEmployee.count({ where: { corporateId: a.corporateId, isActive: true } }),
    prisma.corporateBranch.count({ where: { corporateId: a.corporateId, isActive: true } }),
    prisma.corporateDepartment.count({ where: { corporateId: a.corporateId, isActive: true } }),
    prisma.corporateApprovalRequest.groupBy({ by: ["status"], where: { corporateId: a.corporateId }, _count: { _all: true } }),
    prisma.corporateApprovalRequest.findMany({ where: { corporateId: a.corporateId, status: "PENDING" }, select: adminApprovalSelect, orderBy: { submittedAt: "asc" }, take: 6 }),
    prisma.booking.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.booking.count({ where: { ...base, status: { not: "CANCELLED" }, pickupDateTime: { gte: todayStart, lt: todayEnd } } }),
    prisma.booking.count({ where: { ...base, status: { in: LIVE_STATUSES }, pickupDateTime: { gte: now } } }),
    prisma.booking.count({ where: month }),
    prisma.booking.aggregate({ where: { ...month, status: { not: "CANCELLED" } }, _sum: { finalFare: true } }),
    prisma.booking.findMany({ where: { ...base, corporateArchivedAt: null, status: { in: LIVE_STATUSES }, pickupDateTime: { gte: now } }, select: adminBookingSelect, orderBy: { pickupDateTime: "asc" }, take: 5 }),
    prisma.booking.findMany({ where: { ...base, status: "TRIP_STARTED" }, select: adminBookingSelect, orderBy: { pickupDateTime: "asc" }, take: 5 }),
    prisma.booking.findMany({ where: { ...base, corporateArchivedAt: null }, select: adminBookingSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 6 }),
    getCorporateCreditAccount(a.corporateId).catch(() => null),
    prisma.corporateBudget.findMany({ where: { corporateId: a.corporateId, status: { in: ["ACTIVE", "EXHAUSTED"] }, startDate: { lte: now }, endDate: { gte: now } }, select: budgetRecordSelect, orderBy: { endDate: "asc" }, take: 12 }),
    pendingApprovalAmounts(a),
    financeSummary(a),
    prisma.notification.count({ where: { userId: a.user.id, readAt: null } }),
    prisma.corporateApprovalRequest.findMany({ where: { corporateId: a.corporateId }, select: { id: true, status: true, submittedAt: true, completedAt: true, employee: { select: { employeeName: true } } }, orderBy: { updatedAt: "desc" }, take: 6 }),
  ]);
  const allIds = [...upcomingList, ...activeList, ...recent].map((b) => b.id);
  const approvalsMap = await approvalsByBooking(allIds);
  const budgets = await Promise.all(budgetRows.map((b) => budgetUsage(b, pendingAmounts)));
  const company = budgets.filter((b) => b.scope === "COMPANY");
  const sum = (rows: typeof budgets, k: "allocatedAmount" | "used" | "committed" | "remaining") => dec(rows.reduce((s, r) => s.plus(r[k]), zero()));
  const counts = Object.fromEntries(approvalCounts.map((c) => [c.status, c._count._all]));
  const byStatus = Object.fromEntries(statusCounts.map((c) => [c.status, c._count._all]));
  const activity = [
    ...recentRequests.map((r) => ({ at: r.completedAt ?? r.submittedAt, kind: "APPROVAL", text: `${r.employee.employeeName}: approval request ${r.status.toLowerCase()}`, href: `/corporate-admin/approvals/${r.id}` })),
    ...recent.map((b) => { const e = employeeOf(b.customer.user.corporateEmployee, a.corporateId); return { at: b.createdAt, kind: "BOOKING", text: `${e?.name ?? "Traveller"} booked ${b.bookingNumber}`, href: `/corporate-admin/bookings/${b.id}` }; }),
  ].sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 8);
  return {
    company: a.company,
    employees: { total: employees, active: activeEmployees },
    organisation: { branches: branchCount, departments: departmentCount },
    approvals: { pending: counts.PENDING ?? 0, approved: counts.APPROVED ?? 0, rejected: counts.REJECTED ?? 0, cancelled: counts.CANCELLED ?? 0 },
    trips: { today, upcoming, active: byStatus.TRIP_STARTED ?? 0, completed: byStatus.TRIP_COMPLETED ?? 0, cancelled: byStatus.CANCELLED ?? 0 },
    month: { bookings: monthCount, spend: dec(monthSpend._sum.finalFare), start: p.monthStart },
    budget: company.length ? { allocated: sum(company, "allocatedAmount"), used: sum(company, "used"), committed: sum(company, "committed"), remaining: sum(company, "remaining"), count: company.length } : null,
    pendingApprovals: pending.map((r) => adminApproval(r)),
    upcoming: upcomingList.map((b) => adminBooking(b, a.corporateId, approvalsMap.get(b.id))),
    active: activeList.map((b) => adminBooking(b, a.corporateId, approvalsMap.get(b.id))),
    recent: recent.map((b) => adminBooking(b, a.corporateId, approvalsMap.get(b.id))),
    activity,
    credit: credit ? { enabled: credit.enabled, creditLimit: credit.creditLimit, outstanding: credit.outstanding, available: credit.availableCredit } : null,
    budgets: budgets.slice(0, 4).map((b) => ({ id: b.id, name: b.budgetName, scope: b.scope, scopeName: b.scopeName, period: b.period, status: b.status, limit: b.allocatedAmount, bookedSpend: b.bookedSpend, endDate: b.endDate })),
    billing: { ...finance, outstandingAmount: finance.outstanding },
    unreadNotifications: unread,
    asOf: now,
  };
}

const employeeDetailSelect = {
  id: true, employeeName: true, employeeCode: true, officialEmail: true, mobile: true, designation: true, managerName: true, managerEmail: true,
  employeeGrade: true, isApprover: true, canBook: true, monthlyTravelLimit: true, yearlyTravelLimit: true, defaultPickupAddress: true, emergencyContactName: true,
  emergencyContactMobile: true, isActive: true, createdAt: true, updatedAt: true, branchId: true, departmentId: true, costCenterId: true, userId: true,
  reportingManagerId: true, approvalManagerId: true, travelPolicyId: true,
  branch: { select: { branchName: true } }, department: { select: { departmentName: true } }, costCenter: { select: { name: true } },
  reportingManager: { select: { id: true, employeeName: true } }, approvalManager: { select: { id: true, employeeName: true } },
  travelPolicy: { select: { id: true, policyName: true } },
  user: { select: { role: true, isActive: true } },
} satisfies Prisma.CorporateEmployeeSelect;

async function employees(request: NextRequest, a: AdminAccess) {
  const employeeId = param(request, "id");
  if (employeeId) {
    const e = await prisma.corporateEmployee.findFirst({ where: { id: idOf(employeeId, "employee"), corporateId: a.corporateId }, select: employeeDetailSelect });
    if (!e) throw new CorporateAdminError(404, "Employee not found.");
    const usage = e.userId ? await corporateTravelPolicyService.employeeUsage(a.corporateId, e.userId) : null;
    const [bookingCount, approvalCount, policy] = await Promise.all([
      e.userId ? prisma.booking.count({ where: { ...companyBookings(a), customer: { userId: e.userId } } }) : 0,
      prisma.corporateApprovalRequest.count({ where: { corporateId: a.corporateId, employeeId: e.id } }),
      corporateTravelPolicyService.resolvePolicy(a.corporateId, e),
    ]);
    const { user, userId, ...rest } = e;
    return {
      ...rest, monthlyTravelLimit: e.monthlyTravelLimit?.toFixed(2) ?? null, yearlyTravelLimit: e.yearlyTravelLimit?.toFixed(2) ?? null,
      login: userId ? { enabled: !!user?.isActive, role: user?.role ?? null } : null,
      isSelf: e.id === a.adminEmployeeId,
      effectivePolicy: policy ? { id: policy.id, name: policy.policyName, source: e.travelPolicyId === policy.id ? "ASSIGNED" : policy.departmentId ? "DEPARTMENT" : policy.branchId ? "BRANCH" : "COMPANY" } : null,
      usage: usage ? { month: dec(usage.monthUsed), year: dec(usage.yearUsed) } : null,
      bookingCount, approvalCount,
    };
  }
  const q = param(request, "q"), branchId = param(request, "branchId"), departmentId = param(request, "departmentId"), status = param(request, "status");
  if (status && !["ACTIVE", "INACTIVE"].includes(status)) throw new CorporateAdminError(400, "Invalid status.");
  const n = pageOf(request);
  const where: Prisma.CorporateEmployeeWhereInput = {
    corporateId: a.corporateId,
    ...(branchId ? { branchId: idOf(branchId, "branch") } : {}),
    ...(departmentId ? { departmentId: idOf(departmentId, "department") } : {}),
    ...(status ? { isActive: status === "ACTIVE" } : {}),
    ...(q ? { OR: [{ employeeName: { contains: q.slice(0, 60), mode: "insensitive" } }, { employeeCode: { contains: q.slice(0, 60), mode: "insensitive" } }, { officialEmail: { contains: q.slice(0, 80), mode: "insensitive" } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.corporateEmployee.findMany({
      where, orderBy: [{ employeeName: "asc" }, { id: "asc" }], skip: (n - 1) * PAGE, take: PAGE,
      select: { ...employeeSummarySelect, officialEmail: true, mobile: true, isApprover: true, canBook: true, monthlyTravelLimit: true, yearlyTravelLimit: true, userId: true, reportingManager: { select: { employeeName: true } }, travelPolicy: { select: { policyName: true } } },
    }),
    prisma.corporateEmployee.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({
      ...employeeOf(r, a.corporateId)!, email: r.officialEmail, mobile: r.mobile, isApprover: r.isApprover, canBook: r.canBook, hasLogin: !!r.userId,
      reportingManager: r.reportingManager?.employeeName ?? null, policy: r.travelPolicy?.policyName ?? null,
      monthlyTravelLimit: r.monthlyTravelLimit?.toFixed(2) ?? null, yearlyTravelLimit: r.yearlyTravelLimit?.toFixed(2) ?? null,
    })),
    page: n, pageSize: PAGE, total,
  };
}

async function orgOptions(a: AdminAccess) {
  const [branches, departments, costCenters, people, policies] = await Promise.all([
    prisma.corporateBranch.findMany({ where: { corporateId: a.corporateId }, select: { id: true, branchName: true, city: true, isActive: true }, orderBy: { branchName: "asc" }, take: 500 }),
    prisma.corporateDepartment.findMany({ where: { corporateId: a.corporateId }, select: { id: true, departmentName: true, branchId: true, isActive: true }, orderBy: { departmentName: "asc" }, take: 500 }),
    prisma.corporateCostCenter.findMany({ where: { corporateId: a.corporateId, isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.corporateEmployee.findMany({ where: { corporateId: a.corporateId, isActive: true }, select: { id: true, employeeName: true, employeeCode: true, designation: true, branchId: true, departmentId: true, userId: true }, orderBy: { employeeName: "asc" }, take: 2000 }),
    prisma.corporateTravelPolicy.findMany({ where: { corporateId: a.corporateId, isActive: true }, select: { id: true, policyName: true, branchId: true, departmentId: true }, orderBy: { policyName: "asc" }, take: 200 }),
  ]);
  return {
    branches, departments, costCenters, policies, vehicleCategories: Object.values(VehicleCategory),
    people: people.map(({ userId, ...p }) => ({ ...p, hasLogin: !!userId })),
  };
}

async function branches(request: NextRequest, a: AdminAccess) {
  const q = param(request, "q");
  const rows = await prisma.corporateBranch.findMany({
    where: { corporateId: a.corporateId, ...(q ? { OR: [{ branchName: { contains: q.slice(0, 60), mode: "insensitive" } }, { city: { contains: q.slice(0, 60), mode: "insensitive" } }, { branchCode: { contains: q.slice(0, 60), mode: "insensitive" } }] } : {}) },
    select: { id: true, branchName: true, branchCode: true, address: true, city: true, state: true, pincode: true, isHeadOffice: true, isActive: true, contactName: true, contactPhone: true, contactEmail: true, gstNumber: true, updatedAt: true, _count: { select: { employees: true, departments: true, policies: true, budgets: true } } },
    orderBy: [{ isActive: "desc" }, { isHeadOffice: "desc" }, { branchName: "asc" }], take: 500,
  });
  return { items: rows.map(({ _count, ...r }) => ({ ...r, employeeCount: _count.employees, departmentCount: _count.departments, policyCount: _count.policies, budgetCount: _count.budgets })) };
}

async function departments(request: NextRequest, a: AdminAccess) {
  const q = param(request, "q"), branchId = param(request, "branchId");
  const rows = await prisma.corporateDepartment.findMany({
    where: { corporateId: a.corporateId, ...(branchId ? { branchId: idOf(branchId, "branch") } : {}), ...(q ? { OR: [{ departmentName: { contains: q.slice(0, 60), mode: "insensitive" } }, { departmentCode: { contains: q.slice(0, 60), mode: "insensitive" } }] } : {}) },
    select: {
      id: true, departmentName: true, departmentCode: true, branchId: true, isActive: true, headEmployeeId: true, approverEmployeeId: true, updatedAt: true,
      branch: { select: { branchName: true } }, head: { select: { employeeName: true } }, approver: { select: { employeeName: true } },
      _count: { select: { employees: true, policies: true, budgets: true } },
    },
    orderBy: [{ isActive: "desc" }, { departmentName: "asc" }], take: 500,
  });
  return { items: rows.map(({ _count, head, approver, ...r }) => ({ ...r, head: head?.employeeName ?? null, approver: approver?.employeeName ?? null, employeeCount: _count.employees, policyCount: _count.policies, budgetCount: _count.budgets })) };
}

const policyView = (p: Prisma.CorporateTravelPolicyGetPayload<{ include: { branch: { select: { branchName: true } }; department: { select: { departmentName: true } }; _count: { select: { assignedEmployees: true } } } }>) => ({
  id: p.id, policyName: p.policyName, description: p.description, maxTripAmount: p.maxTripAmount?.toFixed(2) ?? null, blockAboveAmount: p.blockAboveAmount?.toFixed(2) ?? null,
  allowedCategories: policyCategories(p), allowedCities: policyCities(p), advanceBookingHours: p.advanceBookingHours,
  nightTravelAllowed: p.nightTravelAllowed, outstationAllowed: p.outstationAllowed, airportTravelAllowed: p.airportTravelAllowed, localAllowed: p.localAllowed,
  roundTripAllowed: p.roundTripAllowed, weekendTravelAllowed: p.weekendTravelAllowed, bookingStartHour: p.bookingStartHour, bookingEndHour: p.bookingEndHour,
  approvalRequired: p.approvalRequired, isActive: p.isActive, updatedAt: p.updatedAt,
  scope: p.departmentId ? "DEPARTMENT" : p.branchId ? "BRANCH" : "COMPANY", branchId: p.branchId, departmentId: p.departmentId,
  scopeName: p.department?.departmentName ?? p.branch?.branchName ?? "Whole company", assignedEmployees: p._count.assignedEmployees,
});

export async function policies(a: AdminAccess) {
  const [rows, workflow, cities] = await Promise.all([
    prisma.corporateTravelPolicy.findMany({ where: { corporateId: a.corporateId }, include: { branch: { select: { branchName: true } }, department: { select: { departmentName: true } }, _count: { select: { assignedEmployees: true } } }, orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }], take: 100 }),
    corporateApprovalService.getWorkflow(a.corporateId),
    // Cities the marketplace currently serves, offered as pickup-city choices.
    prisma.pricingPackage.findMany({ where: { isActive: true, city: { not: null } }, select: { city: true }, distinct: ["city"], take: 100 }),
  ]);
  const items = rows.map(policyView);
  // The company default is the newest active unscoped policy (what CorporateTravelPolicyService applies).
  const defaultPolicy = items.find((p) => p.isActive && p.scope === "COMPANY") ?? null;
  return {
    policy: defaultPolicy, policies: items, vehicleCategories: Object.values(VehicleCategory),
    cities: [...new Set(cities.map((c) => c.city!.trim()).filter(Boolean))].sort(), approvalStages: workflow.stages.length,
  };
}

async function workflow(a: AdminAccess) {
  const [rules, corporate] = await Promise.all([
    prisma.corporateApprovalRule.findMany({ where: { corporateId: a.corporateId }, orderBy: { level: "asc" } }),
    prisma.corporate.findUnique({ where: { id: a.corporateId }, select: { approvalFlow: true } }),
  ]);
  const ids = [...new Set(rules.flatMap((r) => [r.approverEmployeeId, r.scopeEmployeeId]).filter((x): x is string => !!x))];
  const branchIds = [...new Set(rules.map((r) => r.scopeBranchId).filter((x): x is string => !!x))];
  const deptIds = [...new Set(rules.map((r) => r.scopeDepartmentId).filter((x): x is string => !!x))];
  const [people, branchRows, deptRows] = await Promise.all([
    ids.length ? prisma.corporateEmployee.findMany({ where: { id: { in: ids }, corporateId: a.corporateId }, select: { id: true, employeeName: true } }) : [],
    branchIds.length ? prisma.corporateBranch.findMany({ where: { id: { in: branchIds }, corporateId: a.corporateId }, select: { id: true, branchName: true } }) : [],
    deptIds.length ? prisma.corporateDepartment.findMany({ where: { id: { in: deptIds }, corporateId: a.corporateId }, select: { id: true, departmentName: true } }) : [],
  ]);
  const name = new Map<string, string>([...people.map((p) => [p.id, p.employeeName] as const), ...branchRows.map((b) => [b.id, b.branchName] as const), ...deptRows.map((d) => [d.id, d.departmentName] as const)]);
  return {
    approvalFlow: corporate?.approvalFlow ?? null,
    approverTypes: APPROVER_TYPES.map((t) => ({ value: t, label: APPROVER_LABEL[t] })),
    rules: rules.map((r) => ({
      id: r.id, level: r.level, approverDesignation: r.approverDesignation, isActive: r.isActive, updatedAt: r.updatedAt,
      maxAmount: r.maxAmount?.toFixed(2) ?? null, minAmount: r.minAmount?.toFixed(2) ?? null,
      approverType: r.approverType, approverEmployeeId: r.approverEmployeeId, approverName: r.approverEmployeeId ? name.get(r.approverEmployeeId) ?? null : null,
      scopeBranchId: r.scopeBranchId, scopeDepartmentId: r.scopeDepartmentId, scopeEmployeeId: r.scopeEmployeeId,
      scopeName: (r.scopeEmployeeId && name.get(r.scopeEmployeeId)) || (r.scopeDepartmentId && name.get(r.scopeDepartmentId)) || (r.scopeBranchId && name.get(r.scopeBranchId)) || "Whole company",
      scope: r.scopeEmployeeId ? "EMPLOYEE" : r.scopeDepartmentId ? "DEPARTMENT" : r.scopeBranchId ? "BRANCH" : "COMPANY",
    })),
  };
}

// Employee-level booked spend (non-cancelled company rides by pickup date) from the central Booking table.
async function spendByEmployee(a: AdminAccess, start: Date, end: Date) {
  const grouped = await prisma.booking.groupBy({ by: ["customerId"], where: { ...companyBookings(a), status: { not: "CANCELLED" }, pickupDateTime: { gte: start, lt: end } }, _sum: { finalFare: true } });
  const customers = grouped.length ? await prisma.customer.findMany({ where: { id: { in: grouped.map((g) => g.customerId) } }, select: { id: true, userId: true } }) : [];
  const userOf = new Map(customers.map((c) => [c.id, c.userId]));
  const byUser = new Map<string, Prisma.Decimal>();
  for (const g of grouped) { const u = userOf.get(g.customerId); if (u) byUser.set(u, (byUser.get(u) ?? zero()).plus(g._sum.finalFare ?? 0)); }
  return byUser;
}

async function budgets(request: NextRequest, a: AdminAccess) {
  const p = indiaPeriods();
  const scope = param(request, "scope");
  if (scope && !["COMPANY", "BRANCH", "DEPARTMENT", "EMPLOYEE"].includes(scope)) throw new CorporateAdminError(400, "Invalid scope.");
  const scopeWhere: Prisma.CorporateBudgetWhereInput = scope === "COMPANY" ? { branchId: null, departmentId: null, employeeId: null }
    : scope === "BRANCH" ? { branchId: { not: null }, departmentId: null, employeeId: null } : scope === "DEPARTMENT" ? { departmentId: { not: null }, employeeId: null } : scope === "EMPLOYEE" ? { employeeId: { not: null } } : {};
  const [rows, limited, monthSpend, yearSpend, pending] = await Promise.all([
    prisma.corporateBudget.findMany({ where: { corporateId: a.corporateId, ...scopeWhere }, select: budgetRecordSelect, orderBy: [{ endDate: "desc" }], take: 100 }),
    prisma.corporateEmployee.findMany({ where: { corporateId: a.corporateId, OR: [{ monthlyTravelLimit: { not: null } }, { yearlyTravelLimit: { not: null } }] }, select: { ...employeeSummarySelect, userId: true, monthlyTravelLimit: true, yearlyTravelLimit: true }, orderBy: { employeeName: "asc" }, take: 200 }),
    spendByEmployee(a, p.monthStart, p.monthEnd),
    spendByEmployee(a, p.yearStart, p.yearEnd),
    pendingApprovalAmounts(a),
  ]);
  const items = await Promise.all(rows.map((b) => budgetUsage(b, pending)));
  return {
    scope: scope ?? "ALL",
    budgets: items,
    employeeLimits: limited.map((e) => {
      const m = e.userId ? monthSpend.get(e.userId) ?? zero() : zero();
      const y = e.userId ? yearSpend.get(e.userId) ?? zero() : zero();
      return {
        employee: employeeOf(e, a.corporateId),
        monthly: e.monthlyTravelLimit ? { limit: dec(e.monthlyTravelLimit), used: dec(m), remaining: dec(Prisma.Decimal.max(e.monthlyTravelLimit.minus(m), 0)) } : null,
        yearly: e.yearlyTravelLimit ? { limit: dec(e.yearlyTravelLimit), used: dec(y), remaining: dec(Prisma.Decimal.max(e.yearlyTravelLimit.minus(y), 0)) } : null,
      };
    }),
    periods: p,
  };
}

function rangeOf(request: NextRequest, defaultDays = 365) {
  const today = new Date();
  const from = istDate(param(request, "from"), "start date") ?? istDate(monthKey(new Date(today.getTime() - defaultDays * 86400000)) + "-01", "start date")!;
  const to = istDate(param(request, "to"), "end date", true) ?? new Date(new Date(`${dayKey(today)}T00:00:00+05:30`).getTime() + 86400000);
  if (to <= from || to.getTime() - from.getTime() > 400 * 86400000) throw new CorporateAdminError(400, "Choose a date range of up to one year.");
  return { from, to };
}

const REPORT_CAP = 20000;
type Agg = { bookings: number; completed: number; cancelled: number; spend: Prisma.Decimal; gst: Prisma.Decimal; billed: Prisma.Decimal; paid: Prisma.Decimal; outstanding: Prisma.Decimal; unbilled: Prisma.Decimal };
const agg = (): Agg => ({ bookings: 0, completed: 0, cancelled: 0, spend: zero(), gst: zero(), billed: zero(), paid: zero(), outstanding: zero(), unbilled: zero() });
const outAgg = (m: Map<string, Agg & Record<string, unknown>>) => [...m.entries()].map(([key, v]) => ({ key, ...v, spend: dec(v.spend), gst: dec(v.gst), billed: dec(v.billed), paid: dec(v.paid), outstanding: dec(v.outstanding), unbilled: dec(v.unbilled) }));

// Groups company bookings in a range by month, branch, department, employee and service.
async function breakdown(a: AdminAccess, where: Prisma.BookingWhereInput) {
  const rows = await prisma.booking.findMany({
    where, take: REPORT_CAP + 1, orderBy: { pickupDateTime: "asc" },
    select: {
      status: true, pickupDateTime: true, finalFare: true, estimatedFare: true, taxAmount: true, tripType: true,
      pricingPackage: { select: { packageType: true } }, invoice: { select: { totalAmount: true, paymentStatus: true } },
      transactions: { select: { paymentMethod: true }, take: 1, orderBy: { createdAt: "desc" } },
      customer: { select: { user: { select: { corporateEmployee: { select: employeeSummarySelect } } } } },
    },
  });
  const truncated = rows.length > REPORT_CAP;
  const months = new Map<string, Agg>(), branchesMap = new Map<string, Agg & { name: string }>(), depts = new Map<string, Agg & { name: string }>(), people = new Map<string, Agg & { name: string; code: string }>(), services = new Map<string, Agg>(), statuses = new Map<string, number>();
  let creditSpend = zero();
  const add = (t: Agg, r: (typeof rows)[number]) => {
    t.bookings++;
    if (r.status === "TRIP_COMPLETED") t.completed++;
    if (r.status === "CANCELLED") { t.cancelled++; return; }
    t.spend = t.spend.plus(fare(r));
    t.gst = t.gst.plus(r.taxAmount ?? 0);
    if (r.invoice) {
      t.billed = t.billed.plus(r.invoice.totalAmount);
      if (r.invoice.paymentStatus === "PAID") t.paid = t.paid.plus(r.invoice.totalAmount);
      else if (OPEN_INVOICE.includes(r.invoice.paymentStatus)) t.outstanding = t.outstanding.plus(r.invoice.totalAmount);
    } else if (r.status === "TRIP_COMPLETED") t.unbilled = t.unbilled.plus(fare(r));
  };
  for (const r of rows.slice(0, REPORT_CAP)) {
    const e = employeeOf(r.customer.user.corporateEmployee, a.corporateId);
    const mk = monthKey(r.pickupDateTime);
    if (!months.has(mk)) months.set(mk, agg()); add(months.get(mk)!, r);
    const bk = e?.branch?.id ?? "none";
    if (!branchesMap.has(bk)) branchesMap.set(bk, { ...agg(), name: e?.branch?.name ?? "No branch" }); add(branchesMap.get(bk)!, r);
    const dk = e?.department?.id ?? "none";
    if (!depts.has(dk)) depts.set(dk, { ...agg(), name: e?.department?.name ?? "No department" }); add(depts.get(dk)!, r);
    const pk = e?.id ?? "unknown";
    if (!people.has(pk)) people.set(pk, { ...agg(), name: e?.name ?? "Unlinked traveller", code: e?.code ?? "" }); add(people.get(pk)!, r);
    // serviceOf reads only packageType and tripType.
    const sk = r.pricingPackage?.packageType?.startsWith("AIRPORT") ? "AIRPORT" : serviceOf(r as unknown as Parameters<typeof serviceOf>[0]);
    if (!services.has(sk)) services.set(sk, agg()); add(services.get(sk)!, r);
    statuses.set(r.status, (statuses.get(r.status) ?? 0) + 1);
    if (r.status !== "CANCELLED" && r.transactions[0]?.paymentMethod === "CORPORATE_CREDIT") creditSpend = creditSpend.plus(fare(r));
  }
  const bySpend = (x: { spend: string }, y: { spend: string }) => Number(y.spend) - Number(x.spend);
  return {
    truncated, count: Math.min(rows.length, REPORT_CAP), creditSpend: dec(creditSpend),
    byMonth: outAgg(months).sort((x, y) => x.key.localeCompare(y.key)),
    byBranch: outAgg(branchesMap).sort(bySpend),
    byDepartment: outAgg(depts).sort(bySpend),
    byEmployee: outAgg(people).sort(bySpend).slice(0, 50),
    byService: outAgg(services),
    byStatus: [...statuses.entries()].map(([key, count]) => ({ key, count })),
  };
}

async function billing(request: NextRequest, a: AdminAccess) {
  const { from, to } = rangeOf(request, 365);
  const range: Prisma.BookingWhereInput = { pickupDateTime: { gte: from, lt: to } };
  const now = new Date();
  const [credit, corporate, invoiceSetting, transactions, budgetRows, pending, lifetime, inRange, upcomingDue] = await Promise.all([
    getCorporateCreditAccount(a.corporateId).catch(() => null),
    prisma.corporate.findUnique({ where: { id: a.corporateId }, select: { billingCycle: true, paymentTermsDays: true, status: true } }),
    prisma.corporateInvoiceSetting.findUnique({ where: { corporateId: a.corporateId }, select: { autoGenerateInvoice: true, invoiceEmail: true, gstEnabled: true, reminderDays: true } }),
    prisma.corporateWalletTransaction.findMany({ where: { wallet: { corporateId: a.corporateId } }, select: { id: true, transactionType: true, amount: true, balanceAfter: true, referenceId: true, referenceType: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.corporateBudget.findMany({ where: { corporateId: a.corporateId, branchId: null, departmentId: null, employeeId: null, status: { in: ["ACTIVE", "EXHAUSTED"] }, startDate: { lte: now }, endDate: { gte: now } }, select: budgetRecordSelect, take: 10 }),
    pendingApprovalAmounts(a),
    financeSummary(a),
    financeSummary(a, range),
    prisma.invoice.findMany({ where: { booking: companyBookings(a), paymentStatus: { in: OPEN_INVOICE } }, select: { id: true, invoiceNumber: true, totalAmount: true, dueDate: true, paymentStatus: true, booking: { select: { id: true, bookingNumber: true } } }, orderBy: [{ dueDate: "asc" }, { invoiceDate: "asc" }], take: 20 }),
  ]);
  const bookingRefs = transactions.filter((t) => t.referenceId).map((t) => t.referenceId!);
  const [numbers, rows] = await Promise.all([
    bookingRefs.length ? prisma.booking.findMany({ where: { ...companyBookings(a), id: { in: bookingRefs } }, select: { id: true, bookingNumber: true } }) : [],
    breakdown(a, { AND: [companyBookings(a), range] }),
  ]);
  const numberOf = new Map(numbers.map((b) => [b.id, b.bookingNumber]));
  const budgetsNow = await Promise.all(budgetRows.map((b) => budgetUsage(b, pending)));
  const total = (k: "allocatedAmount" | "used" | "committed" | "remaining") => dec(budgetsNow.reduce((s, b) => s.plus(b[k]), zero()));
  return {
    range: { from, to },
    credit: credit ? { enabled: credit.enabled, creditLimit: credit.creditLimit, outstanding: credit.outstanding, available: credit.availableCredit, updatedAt: credit.updatedAt, status: credit.status } : null,
    terms: { billingCycle: corporate?.billingCycle ?? null, paymentTermsDays: corporate?.paymentTermsDays ?? null },
    invoiceSetting,
    budget: budgetsNow.length ? { allocated: total("allocatedAmount"), used: total("used"), committed: total("committed"), available: total("remaining"), budgets: budgetsNow.map((b) => ({ id: b.id, name: b.budgetName, endDate: b.endDate })) } : null,
    lifetime, inRange,
    openInvoices: upcomingDue.map((i) => ({ ...i, totalAmount: dec(i.totalAmount), overdue: !!i.dueDate && i.dueDate < now, downloadUrl: `/api/corporate-admin/documents/invoice?id=${encodeURIComponent(i.id)}` })),
    breakdown: { truncated: rows.truncated, byMonth: rows.byMonth, byBranch: rows.byBranch, byDepartment: rows.byDepartment, byEmployee: rows.byEmployee },
    ledger: transactions.map((t) => ({ ...t, amount: dec(t.amount), balanceAfter: t.balanceAfter ? dec(t.balanceAfter) : null, bookingNumber: t.referenceId ? numberOf.get(t.referenceId) ?? null : null, bookingId: t.referenceId && numberOf.has(t.referenceId) ? t.referenceId : null })),
  };
}

// Invoice filters shared by the list, the CSV export and the bulk download.
export async function invoiceWhere(request: NextRequest, a: AdminAccess): Promise<Prisma.InvoiceWhereInput> {
  const status = param(request, "status"), q = param(request, "q");
  if (status && !(status in PaymentStatus) && status !== "OVERDUE") throw new CorporateAdminError(400, "Invalid invoice status.");
  const from = istDate(param(request, "from"), "start date"), to = istDate(param(request, "to"), "end date", true);
  const org = await orgFilter(request, a);
  return {
    booking: { ...companyBookings(a), ...org },
    ...(status === "OVERDUE" ? { paymentStatus: { in: OPEN_INVOICE }, dueDate: { lt: new Date() } } : status ? { paymentStatus: status as PaymentStatus } : {}),
    ...(from || to ? { invoiceDate: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
    ...(q ? { invoiceNumber: { contains: q.slice(0, 40), mode: "insensitive" } } : {}),
  };
}

export const invoiceSelect = {
  id: true, invoiceNumber: true, invoiceDate: true, dueDate: true, subtotal: true, taxAmount: true, discountAmount: true, totalAmount: true, paymentStatus: true, paymentMethod: true,
  booking: { select: { id: true, bookingNumber: true, pickupDateTime: true, pickupLocation: true, dropLocation: true, customer: { select: { firstName: true, lastName: true, user: { select: { corporateEmployee: { select: employeeSummarySelect } } } } } } },
} satisfies Prisma.InvoiceSelect;

export function invoiceRow(r: Prisma.InvoiceGetPayload<{ select: typeof invoiceSelect }>, corporateId: string) {
  const e = employeeOf(r.booking.customer.user.corporateEmployee, corporateId);
  const { customer, ...booking } = r.booking;
  return {
    ...r, booking, subtotal: dec(r.subtotal), taxAmount: dec(r.taxAmount), discountAmount: dec(r.discountAmount), totalAmount: dec(r.totalAmount),
    overdue: OPEN_INVOICE.includes(r.paymentStatus) && !!r.dueDate && r.dueDate < new Date(),
    employee: e ? { id: e.id, name: e.name, code: e.code } : { id: null, name: `${customer.firstName} ${customer.lastName}`.trim(), code: "" },
    branch: e?.branch?.name ?? null, department: e?.department?.name ?? null,
    downloadUrl: `/api/corporate-admin/documents/invoice?id=${encodeURIComponent(r.id)}`,
  };
}

async function invoices(request: NextRequest, a: AdminAccess) {
  const n = pageOf(request);
  const where = await invoiceWhere(request, a);
  const [rows, total, totals, unbilled] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy: [{ invoiceDate: "desc" }, { id: "asc" }], skip: (n - 1) * PAGE, take: PAGE, select: invoiceSelect }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({ by: ["paymentStatus"], where, _count: { _all: true }, _sum: { totalAmount: true, taxAmount: true } }),
    // Completed trips that RideGrid Finance has not invoiced yet.
    prisma.booking.aggregate({ where: { ...companyBookings(a), ...(await orgFilter(request, a)), status: "TRIP_COMPLETED", invoice: { is: null } }, _sum: { finalFare: true }, _count: { _all: true } }),
  ]);
  return {
    items: rows.map((r) => invoiceRow(r, a.corporateId)),
    page: n, pageSize: PAGE, total,
    summary: totals.map((t) => ({ status: t.paymentStatus, count: t._count._all, amount: dec(t._sum.totalAmount), tax: dec(t._sum.taxAmount) })),
    unbilled: { trips: unbilled._count._all, amount: dec(unbilled._sum.finalFare) },
  };
}

async function reports(request: NextRequest, a: AdminAccess) {
  const { from, to } = rangeOf(request, 180);
  const status = param(request, "status");
  if (status && !(status in BookingStatus)) throw new CorporateAdminError(400, "Invalid booking status.");
  const org = await orgFilter(request, a);
  const where: Prisma.BookingWhereInput = {
    AND: [companyBookings(a), org, serviceFilter(param(request, "service")), { pickupDateTime: { gte: from, lt: to } }, status ? { status: status as BookingStatus } : {}],
  };
  // orgFilter has already confirmed these identifiers belong to this company.
  const employeeId = param(request, "employeeId"), branchId = param(request, "branchId"), departmentId = param(request, "departmentId");
  const employeeFilter: Prisma.CorporateApprovalRequestWhereInput = employeeId ? { employeeId } : branchId || departmentId ? { employee: { ...(branchId ? { branchId } : {}), ...(departmentId ? { departmentId } : {}) } } : {};
  const approvalWhere: Prisma.CorporateApprovalRequestWhereInput = { corporateId: a.corporateId, submittedAt: { gte: from, lt: to }, ...employeeFilter };
  const [data, approvalsByStatus, finance] = await Promise.all([
    breakdown(a, where),
    prisma.corporateApprovalRequest.groupBy({ by: ["status"], where: approvalWhere, _count: { _all: true }, _sum: { amount: true } }),
    financeSummary(a, { AND: [org, { pickupDateTime: { gte: from, lt: to } }] }),
  ]);
  const spend = data.byMonth.reduce((s, m) => s.plus(m.spend), zero());
  return {
    range: { from, to },
    truncated: data.truncated,
    totals: {
      bookings: data.count, spend: dec(spend), creditSpend: data.creditSpend,
      completed: data.byStatus.find((s) => s.key === "TRIP_COMPLETED")?.count ?? 0, cancelled: data.byStatus.find((s) => s.key === "CANCELLED")?.count ?? 0,
    },
    finance,
    byMonth: data.byMonth, byBranch: data.byBranch, byDepartment: data.byDepartment, byEmployee: data.byEmployee.slice(0, 25), byService: data.byService, byStatus: data.byStatus,
    approvals: approvalsByStatus.map((r) => ({ key: r.status, count: r._count._all, amount: dec(r._sum.amount) })),
  };
}

async function company(a: AdminAccess) {
  const c = await prisma.corporate.findUnique({
    where: { id: a.corporateId },
    select: {
      id: true, companyName: true, legalName: true, gstNumber: true, panNumber: true, email: true, mobile: true, website: true,
      address: true, city: true, state: true, country: true, pincode: true, status: true, billingCycle: true, paymentTermsDays: true,
      billingAddress: true, billingCity: true, billingState: true, billingPincode: true,
      contactPersonName: true, contactPersonDesignation: true, contactPersonEmail: true, contactPersonMobile: true,
      accountManagerName: true, accountManagerEmail: true, accountManagerMobile: true, createdAt: true, updatedAt: true,
      branches: { select: { id: true, branchName: true, city: true, isHeadOffice: true, isActive: true }, orderBy: [{ isHeadOffice: "desc" }, { branchName: "asc" }], take: 50 },
      _count: { select: { employees: true, branches: true, corporateDepartments: true } },
    },
  });
  if (!c) throw new CorporateAdminError(404, "Company not found.");
  const admins = await prisma.user.findMany({ where: { role: "CORPORATE_ADMIN", deletedAt: null, isActive: true, corporateEmployee: { is: { corporateId: a.corporateId, isActive: true } } }, select: { name: true, email: true }, orderBy: { name: "asc" }, take: 20 });
  return { ...c, administrators: admins };
}

async function admins(a: AdminAccess) {
  const [users, approvers, rules] = await Promise.all([
    prisma.user.findMany({ where: { role: "CORPORATE_ADMIN", deletedAt: null, corporateEmployee: { is: { corporateId: a.corporateId } } }, select: { id: true, name: true, email: true, isActive: true, corporateEmployee: { select: { id: true, designation: true, isActive: true } } }, orderBy: { name: "asc" }, take: 100 }),
    prisma.corporateEmployee.findMany({ where: { corporateId: a.corporateId, isApprover: true }, select: { ...employeeSummarySelect, officialEmail: true }, orderBy: { employeeName: "asc" }, take: 200 }),
    prisma.corporateApprovalRule.findMany({ where: { corporateId: a.corporateId, isActive: true }, select: { level: true, approverDesignation: true, approverType: true, maxAmount: true }, orderBy: { level: "asc" } }),
  ]);
  return {
    admins: users.map((u) => ({ userId: u.id, name: u.name, email: u.email, active: u.isActive && !!u.corporateEmployee?.isActive, employeeId: u.corporateEmployee?.id ?? null, designation: u.corporateEmployee?.designation ?? null, isSelf: u.id === a.user.id })),
    approvers: approvers.map((e) => ({ ...employeeOf(e, a.corporateId)!, email: e.officialEmail })),
    stages: rules.map((r) => ({ ...r, approverDesignation: r.approverType && r.approverType !== "CORPORATE_ADMIN" ? APPROVER_LABEL[r.approverType as keyof typeof APPROVER_LABEL] ?? r.approverDesignation : r.approverDesignation, maxAmount: r.maxAmount?.toFixed(2) ?? null })),
  };
}

async function notifications(request: NextRequest, a: AdminAccess) {
  const n = pageOf(request);
  const unreadOnly = param(request, "unread") === "1";
  const where: Prisma.NotificationWhereInput = { userId: a.user.id, ...(unreadOnly ? { readAt: null } : {}) };
  const [items, unread, center] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (n - 1) * 30, take: 31, select: { id: true, title: true, message: true, readAt: true, createdAt: true } }),
    prisma.notification.count({ where: { userId: a.user.id, readAt: null } }),
    // The channel matrix is only needed on the first page of the full inbox.
    n === 1 && !unreadOnly ? notificationCenter() : null,
  ]);
  return { items: items.slice(0, 30), unread, page: n, hasMore: items.length > 30, center };
}

export async function readAdmin(request: NextRequest, section: string, a: AdminAccess) {
  switch (section) {
    case "session": return { user: a.user, company: a.company };
    case "dashboard": return dashboard(a);
    case "approvals": return approvals(request, a);
    case "bookings": return bookings(request, a);
    case "employees": return employees(request, a);
    case "org-options": return orgOptions(a);
    case "branches": return branches(request, a);
    case "departments": return departments(request, a);
    case "policy": return policies(a);
    case "workflow": return workflow(a);
    case "budgets": return budgets(request, a);
    case "billing": return billing(request, a);
    case "invoices": return invoices(request, a);
    case "reports": return reports(request, a);
    case "company": return company(a);
    case "commercial": return commercial(a);
    case "admins": return admins(a);
    case "notifications": return notifications(request, a);
    case "support": return support(a);
    default: throw new CorporateAdminError(404, "Not found.");
  }
}
