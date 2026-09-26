import { NextRequest } from "next/server";
import { BookingStatus, PaymentMethod, PaymentStatus, Prisma, TripStatus, VehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WELLCABS } from "@/lib/website-public/brand";
import { corporateTravelPolicyService, indiaPeriods, policyCategories } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { getCorporateCreditAccount } from "@/lib/services/corporate/CorporateCreditService";
import { trustedTripLocation } from "@/lib/services/booking/TrustedLocationService";
import { serviceOf } from "@/lib/corporate-employee-mobile/selects";
import { AdminAccess, CorporateAdminError, id as idOf, pageOf } from "./access";
import { adminApproval, adminApprovalSelect, adminBooking, adminBookingSelect, employeeOf, employeeSummarySelect } from "./selects";

const PAGE = 20;
const LIVE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"];
const APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

export const companyBookings = (a: AdminAccess): Prisma.BookingWhereInput => ({ corporateId: a.corporateId, deletedAt: null });
const fare = (b: { finalFare: Prisma.Decimal | null; estimatedFare: Prisma.Decimal }) => b.finalFare ?? b.estimatedFare;
const dec = (v: Prisma.Decimal.Value | null | undefined) => new Prisma.Decimal(v ?? 0).toFixed(2);

function param(request: NextRequest, name: string) {
  const v = request.nextUrl.searchParams.get(name);
  return v && v.trim() ? v.trim() : null;
}

// Calendar dates are interpreted in India time, matching the travel policy service.
function istDate(value: string | null, name: string, endOfDay = false) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CorporateAdminError(400, `Invalid ${name}.`);
  const d = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) throw new CorporateAdminError(400, `Invalid ${name}.`);
  return endOfDay ? new Date(d.getTime() + 86400000) : d;
}

const monthKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(d);

// Resolves organisation filters, rejecting identifiers that belong to another company.
async function orgFilter(request: NextRequest, a: AdminAccess) {
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
  if (!service) return {};
  if (service === "LOCAL") return local;
  if (service === "ONE_WAY") return { tripType: "ONEWAY", NOT: local };
  if (service === "ROUNDTRIP") return { tripType: "ROUNDTRIP", NOT: local };
  throw new CorporateAdminError(400, "Invalid service.");
}

async function approvalsByBooking(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; status: string }>();
  const rows = await prisma.corporateApprovalRequest.findMany({ where: { bookingId: { in: ids } }, select: { id: true, status: true, bookingId: true } });
  return new Map(rows.map((r) => [r.bookingId!, { id: r.id, status: r.status }]));
}

async function bookingWhere(request: NextRequest, a: AdminAccess) {
  const status = param(request, "status"), tripStatus = param(request, "tripStatus"), approval = param(request, "approval");
  const vendorId = param(request, "vendorId"), paymentStatus = param(request, "paymentStatus"), paymentMethod = param(request, "paymentMethod");
  const q = param(request, "q");
  if (status && !(status in BookingStatus)) throw new CorporateAdminError(400, "Invalid booking status.");
  if (tripStatus && !(tripStatus in TripStatus)) throw new CorporateAdminError(400, "Invalid trip status.");
  if (paymentStatus && !(paymentStatus in PaymentStatus)) throw new CorporateAdminError(400, "Invalid payment status.");
  if (paymentMethod && !(paymentMethod in PaymentMethod)) throw new CorporateAdminError(400, "Invalid payment method.");
  if (approval && !["REQUIRED", "DIRECT"].includes(approval)) throw new CorporateAdminError(400, "Invalid approval filter.");
  const from = istDate(param(request, "from"), "start date"), to = istDate(param(request, "to"), "end date", true);
  const and: Prisma.BookingWhereInput[] = [companyBookings(a), await orgFilter(request, a), serviceFilter(param(request, "service"))];
  if (status) and.push({ status: status as BookingStatus });
  if (param(request, "when") === "upcoming") and.push({ status: { in: LIVE_STATUSES }, pickupDateTime: { gte: new Date() } });
  if (tripStatus) and.push({ trip: { is: { status: tripStatus as TripStatus, deletedAt: null } } });
  if (vendorId) and.push({ vendorId: idOf(vendorId, "vendor") });
  if (paymentStatus || paymentMethod) and.push({ transactions: { some: { ...(paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {}), ...(paymentMethod ? { paymentMethod: paymentMethod as PaymentMethod } : {}) } } });
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
  const [rows, total, vendors] = await Promise.all([
    prisma.booking.findMany({ where, select: adminBookingSelect, orderBy: [{ pickupDateTime: "desc" }, { id: "asc" }], skip: (n - 1) * PAGE, take: PAGE }),
    prisma.booking.count({ where }),
    n === 1 ? prisma.vendor.findMany({ where: { bookings: { some: companyBookings(a) } }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" }, take: 200 }) : null,
  ]);
  const approvals = await approvalsByBooking(rows.map((r) => r.id));
  return { items: rows.map((r) => adminBooking(r, a.corporateId, approvals.get(r.id))), page: n, pageSize: PAGE, total, vendors };
}

async function bookingDetail(bookingId: string, a: AdminAccess) {
  const b = await prisma.booking.findFirst({
    where: { ...companyBookings(a), id: bookingId },
    select: {
      ...adminBookingSelect,
      reservedFrom: true, reservedUntil: true, cancelReason: true, cancelledAt: true,
      trip: { select: { status: true, deletedAt: true, driverAssignedAt: true, driverAcceptedAt: true, arrivedPickupAt: true, passengerBoardedAt: true, tripStartedAt: true, tripCompletedAt: true, cancelledAt: true } },
      statusHistory: { select: { previousStatus: true, currentStatus: true, action: true, remarks: true, changedAt: true }, orderBy: { changedAt: "asc" }, take: 100 },
      invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paymentStatus: true, invoiceDate: true } },
    },
  });
  if (!b) throw new CorporateAdminError(404, "Booking not found.");
  const approvalRow = await prisma.corporateApprovalRequest.findFirst({ where: { bookingId: b.id, corporateId: a.corporateId }, select: adminApprovalSelect });
  const location = await trustedTripLocation(b.id, b);
  const trip = b.trip && !b.trip.deletedAt ? b.trip : null;
  return {
    ...adminBooking(b, a.corporateId, approvalRow ? { id: approvalRow.id, status: approvalRow.status } : null),
    reservedFrom: b.reservedFrom, reservedUntil: b.reservedUntil, cancelReason: b.cancelReason, cancelledAt: b.cancelledAt,
    trip: trip ? { ...trip, deletedAt: undefined } : null,
    timeline: b.statusHistory,
    approvalRequest: approvalRow ? adminApproval(approvalRow, await approverNames([approvalRow])) : null,
    invoice: b.invoice ? { ...b.invoice, totalAmount: dec(b.invoice.totalAmount) } : null,
    // Only a fresh, attested Driver App position is shown; no location history leaves the server.
    liveLocation: location,
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
    const [booking, names, workflow] = await Promise.all([
      r.bookingId ? prisma.booking.findFirst({ where: { ...companyBookings(a), id: r.bookingId }, select: { id: true, bookingNumber: true, status: true } }) : null,
      approverNames([r]),
      corporateApprovalService.getWorkflow(a.corporateId, r.amount?.toNumber()),
    ]);
    return { ...adminApproval(r, names, booking), workflow: workflow.stages };
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

async function dashboard(a: AdminAccess) {
  const now = new Date();
  const p = indiaPeriods(now);
  const base = companyBookings(a);
  const month = { ...base, pickupDateTime: { gte: p.monthStart, lt: p.monthEnd } };
  const [employees, activeEmployees, approvalCounts, pending, upcoming, active, completed, monthCount, monthSpend, upcomingList, activeList, recent, credit, budgets, outstanding, unread, recentRequests] = await Promise.all([
    prisma.corporateEmployee.count({ where: { corporateId: a.corporateId } }),
    prisma.corporateEmployee.count({ where: { corporateId: a.corporateId, isActive: true } }),
    prisma.corporateApprovalRequest.groupBy({ by: ["status"], where: { corporateId: a.corporateId }, _count: { _all: true } }),
    prisma.corporateApprovalRequest.findMany({ where: { corporateId: a.corporateId, status: "PENDING" }, select: adminApprovalSelect, orderBy: { submittedAt: "asc" }, take: 6 }),
    prisma.booking.count({ where: { ...base, status: { in: LIVE_STATUSES }, pickupDateTime: { gte: now } } }),
    prisma.booking.count({ where: { ...base, status: "TRIP_STARTED" } }),
    prisma.booking.count({ where: { ...base, status: "TRIP_COMPLETED" } }),
    prisma.booking.count({ where: month }),
    prisma.booking.aggregate({ where: { ...month, status: { not: "CANCELLED" } }, _sum: { finalFare: true } }),
    prisma.booking.findMany({ where: { ...base, status: { in: LIVE_STATUSES }, pickupDateTime: { gte: now } }, select: adminBookingSelect, orderBy: { pickupDateTime: "asc" }, take: 5 }),
    prisma.booking.findMany({ where: { ...base, status: "TRIP_STARTED" }, select: adminBookingSelect, orderBy: { pickupDateTime: "asc" }, take: 5 }),
    prisma.booking.findMany({ where: base, select: adminBookingSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 6 }),
    getCorporateCreditAccount(a.corporateId).catch(() => null),
    prisma.corporateBudget.findMany({ where: { corporateId: a.corporateId, status: { in: ["ACTIVE", "EXHAUSTED"] }, endDate: { gte: now } }, select: { id: true, budgetName: true, period: true, allocatedAmount: true, startDate: true, endDate: true, status: true }, orderBy: { endDate: "asc" }, take: 4 }),
    prisma.invoice.aggregate({ where: { booking: base, paymentStatus: { in: ["PENDING", "PARTIAL"] } }, _sum: { totalAmount: true }, _count: { _all: true } }),
    prisma.notification.count({ where: { userId: a.user.id, readAt: null } }),
    prisma.corporateApprovalRequest.findMany({ where: { corporateId: a.corporateId }, select: { id: true, status: true, submittedAt: true, completedAt: true, employee: { select: { employeeName: true } } }, orderBy: { updatedAt: "desc" }, take: 6 }),
  ]);
  const allIds = [...upcomingList, ...activeList, ...recent].map((b) => b.id);
  const approvalsMap = await approvalsByBooking(allIds);
  const budgetUsage = await Promise.all(budgets.map(async (b) => {
    const used = await prisma.booking.aggregate({ where: { ...base, status: { not: "CANCELLED" }, pickupDateTime: { gte: b.startDate, lte: b.endDate } }, _sum: { finalFare: true } });
    return { id: b.id, name: b.budgetName, period: b.period, status: b.status, limit: dec(b.allocatedAmount), bookedSpend: dec(used._sum.finalFare), endDate: b.endDate };
  }));
  const counts = Object.fromEntries(approvalCounts.map((c) => [c.status, c._count._all]));
  const activity = [
    ...recentRequests.map((r) => ({ at: r.completedAt ?? r.submittedAt, kind: "APPROVAL", text: `${r.employee.employeeName}: approval request ${r.status.toLowerCase()}`, href: `/corporate-admin/approvals/${r.id}` })),
    ...recent.map((b) => { const e = employeeOf(b.customer.user.corporateEmployee, a.corporateId); return { at: b.createdAt, kind: "BOOKING", text: `${e?.name ?? "Traveller"} booked ${b.bookingNumber}`, href: `/corporate-admin/bookings/${b.id}` }; }),
  ].sort((x, y) => +new Date(y.at) - +new Date(x.at)).slice(0, 8);
  return {
    company: a.company,
    employees: { total: employees, active: activeEmployees },
    approvals: { pending: counts.PENDING ?? 0, approved: counts.APPROVED ?? 0, rejected: counts.REJECTED ?? 0, cancelled: counts.CANCELLED ?? 0 },
    trips: { upcoming, active, completed },
    month: { bookings: monthCount, spend: dec(monthSpend._sum.finalFare), start: p.monthStart },
    pendingApprovals: pending.map((r) => adminApproval(r)),
    upcoming: upcomingList.map((b) => adminBooking(b, a.corporateId, approvalsMap.get(b.id))),
    active: activeList.map((b) => adminBooking(b, a.corporateId, approvalsMap.get(b.id))),
    recent: recent.map((b) => adminBooking(b, a.corporateId, approvalsMap.get(b.id))),
    activity,
    credit: credit ? { enabled: credit.enabled, creditLimit: credit.creditLimit, outstanding: credit.outstanding, available: credit.availableCredit } : null,
    budgets: budgetUsage,
    billing: { outstandingInvoices: outstanding._count._all, outstandingAmount: dec(outstanding._sum.totalAmount) },
    unreadNotifications: unread,
    asOf: now,
  };
}

async function employees(request: NextRequest, a: AdminAccess) {
  const employeeId = param(request, "id");
  if (employeeId) {
    const e = await prisma.corporateEmployee.findFirst({
      where: { id: idOf(employeeId, "employee"), corporateId: a.corporateId },
      select: {
        id: true, employeeName: true, employeeCode: true, officialEmail: true, mobile: true, designation: true, managerName: true, managerEmail: true,
        employeeGrade: true, isApprover: true, monthlyTravelLimit: true, yearlyTravelLimit: true, defaultPickupAddress: true, emergencyContactName: true,
        emergencyContactMobile: true, isActive: true, createdAt: true, updatedAt: true, branchId: true, departmentId: true, costCenterId: true, userId: true,
        branch: { select: { branchName: true } }, department: { select: { departmentName: true } }, costCenter: { select: { name: true } },
        user: { select: { role: true, isActive: true } },
      },
    });
    if (!e) throw new CorporateAdminError(404, "Employee not found.");
    const usage = e.userId ? await corporateTravelPolicyService.employeeUsage(a.corporateId, e.userId) : null;
    const [bookingCount, approvalCount] = await Promise.all([
      e.userId ? prisma.booking.count({ where: { ...companyBookings(a), customer: { userId: e.userId } } }) : 0,
      prisma.corporateApprovalRequest.count({ where: { corporateId: a.corporateId, employeeId: e.id } }),
    ]);
    const { user, userId, ...rest } = e;
    return {
      ...rest, monthlyTravelLimit: e.monthlyTravelLimit?.toFixed(2) ?? null, yearlyTravelLimit: e.yearlyTravelLimit?.toFixed(2) ?? null,
      login: userId ? { enabled: !!user?.isActive, role: user?.role ?? null } : null,
      isSelf: e.id === a.adminEmployeeId,
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
      select: { ...employeeSummarySelect, officialEmail: true, mobile: true, isApprover: true, monthlyTravelLimit: true, yearlyTravelLimit: true, userId: true },
    }),
    prisma.corporateEmployee.count({ where }),
  ]);
  return {
    items: rows.map((r) => ({
      ...employeeOf(r, a.corporateId)!, email: r.officialEmail, mobile: r.mobile, isApprover: r.isApprover, hasLogin: !!r.userId,
      monthlyTravelLimit: r.monthlyTravelLimit?.toFixed(2) ?? null, yearlyTravelLimit: r.yearlyTravelLimit?.toFixed(2) ?? null,
    })),
    page: n, pageSize: PAGE, total,
  };
}

async function orgOptions(a: AdminAccess) {
  const [branches, departments, costCenters] = await Promise.all([
    prisma.corporateBranch.findMany({ where: { corporateId: a.corporateId }, select: { id: true, branchName: true, city: true }, orderBy: { branchName: "asc" }, take: 500 }),
    prisma.corporateDepartment.findMany({ where: { corporateId: a.corporateId }, select: { id: true, departmentName: true, branchId: true }, orderBy: { departmentName: "asc" }, take: 500 }),
    prisma.corporateCostCenter.findMany({ where: { corporateId: a.corporateId, isActive: true }, select: { id: true, name: true, code: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  return { branches, departments, costCenters, vehicleCategories: Object.values(VehicleCategory) };
}

async function branches(request: NextRequest, a: AdminAccess) {
  const q = param(request, "q");
  const rows = await prisma.corporateBranch.findMany({
    where: { corporateId: a.corporateId, ...(q ? { OR: [{ branchName: { contains: q.slice(0, 60), mode: "insensitive" } }, { city: { contains: q.slice(0, 60), mode: "insensitive" } }, { branchCode: { contains: q.slice(0, 60), mode: "insensitive" } }] } : {}) },
    select: { id: true, branchName: true, branchCode: true, address: true, city: true, state: true, pincode: true, isHeadOffice: true, updatedAt: true, _count: { select: { employees: true, departments: true } } },
    orderBy: [{ isHeadOffice: "desc" }, { branchName: "asc" }], take: 500,
  });
  return { items: rows.map(({ _count, ...r }) => ({ ...r, employeeCount: _count.employees, departmentCount: _count.departments })) };
}

async function departments(request: NextRequest, a: AdminAccess) {
  const q = param(request, "q"), branchId = param(request, "branchId");
  const rows = await prisma.corporateDepartment.findMany({
    where: { corporateId: a.corporateId, ...(branchId ? { branchId: idOf(branchId, "branch") } : {}), ...(q ? { OR: [{ departmentName: { contains: q.slice(0, 60), mode: "insensitive" } }, { departmentCode: { contains: q.slice(0, 60), mode: "insensitive" } }] } : {}) },
    select: { id: true, departmentName: true, departmentCode: true, branchId: true, updatedAt: true, branch: { select: { branchName: true } }, _count: { select: { employees: true } } },
    orderBy: { departmentName: "asc" }, take: 500,
  });
  return { items: rows.map(({ _count, ...r }) => ({ ...r, employeeCount: _count.employees })) };
}

export async function policyView(a: AdminAccess) {
  const [policy, workflow] = await Promise.all([
    corporateTravelPolicyService.getActivePolicy(a.corporateId),
    corporateApprovalService.getWorkflow(a.corporateId),
  ]);
  return {
    policy: policy ? {
      id: policy.id, policyName: policy.policyName, maxTripAmount: policy.maxTripAmount?.toFixed(2) ?? null,
      allowedCategories: policyCategories(policy), advanceBookingHours: policy.advanceBookingHours,
      nightTravelAllowed: policy.nightTravelAllowed, outstationAllowed: policy.outstationAllowed,
      airportTravelAllowed: policy.airportTravelAllowed, approvalRequired: policy.approvalRequired, updatedAt: policy.updatedAt,
    } : null,
    vehicleCategories: Object.values(VehicleCategory),
    approvalStages: workflow.stages.length,
  };
}

async function workflow(a: AdminAccess) {
  const [rules, corporate] = await Promise.all([
    prisma.corporateApprovalRule.findMany({ where: { corporateId: a.corporateId }, select: { id: true, level: true, approverDesignation: true, maxAmount: true, isActive: true, updatedAt: true }, orderBy: { level: "asc" } }),
    prisma.corporate.findUnique({ where: { id: a.corporateId }, select: { approvalFlow: true } }),
  ]);
  return { approvalFlow: corporate?.approvalFlow ?? null, rules: rules.map((r) => ({ ...r, maxAmount: r.maxAmount?.toFixed(2) ?? null })) };
}

// Employee-level booked spend (non-cancelled company rides by pickup date) from the central Booking table.
async function spendByEmployee(a: AdminAccess, start: Date, end: Date) {
  const grouped = await prisma.booking.groupBy({ by: ["customerId"], where: { ...companyBookings(a), status: { not: "CANCELLED" }, pickupDateTime: { gte: start, lt: end } }, _sum: { finalFare: true } });
  const customers = grouped.length ? await prisma.customer.findMany({ where: { id: { in: grouped.map((g) => g.customerId) } }, select: { id: true, userId: true } }) : [];
  const userOf = new Map(customers.map((c) => [c.id, c.userId]));
  const byUser = new Map<string, Prisma.Decimal>();
  for (const g of grouped) { const u = userOf.get(g.customerId); if (u) byUser.set(u, (byUser.get(u) ?? new Prisma.Decimal(0)).plus(g._sum.finalFare ?? 0)); }
  return byUser;
}

async function budgets(a: AdminAccess) {
  const p = indiaPeriods();
  const [rows, limited, monthSpend, yearSpend] = await Promise.all([
    prisma.corporateBudget.findMany({ where: { corporateId: a.corporateId }, select: { id: true, budgetName: true, period: true, status: true, allocatedAmount: true, utilizedAmount: true, alertThreshold: true, startDate: true, endDate: true, updatedAt: true }, orderBy: [{ endDate: "desc" }], take: 50 }),
    prisma.corporateEmployee.findMany({ where: { corporateId: a.corporateId, OR: [{ monthlyTravelLimit: { not: null } }, { yearlyTravelLimit: { not: null } }] }, select: { ...employeeSummarySelect, userId: true, monthlyTravelLimit: true, yearlyTravelLimit: true }, orderBy: { employeeName: "asc" }, take: 200 }),
    spendByEmployee(a, p.monthStart, p.monthEnd),
    spendByEmployee(a, p.yearStart, p.yearEnd),
  ]);
  const items = await Promise.all(rows.map(async (b) => {
    const used = await prisma.booking.aggregate({ where: { ...companyBookings(a), status: { not: "CANCELLED" }, pickupDateTime: { gte: b.startDate, lte: b.endDate } }, _sum: { finalFare: true } });
    const booked = used._sum.finalFare ?? new Prisma.Decimal(0);
    return {
      ...b, allocatedAmount: dec(b.allocatedAmount), utilizedAmount: dec(b.utilizedAmount), alertThreshold: b.alertThreshold?.toFixed(2) ?? null,
      bookedSpend: dec(booked), remaining: dec(Prisma.Decimal.max(b.allocatedAmount.minus(booked), 0)),
    };
  }));
  return {
    scope: "COMPANY",
    budgets: items,
    employeeLimits: limited.map((e) => {
      const m = e.userId ? monthSpend.get(e.userId) ?? new Prisma.Decimal(0) : new Prisma.Decimal(0);
      const y = e.userId ? yearSpend.get(e.userId) ?? new Prisma.Decimal(0) : new Prisma.Decimal(0);
      return {
        employee: employeeOf(e, a.corporateId),
        monthly: e.monthlyTravelLimit ? { limit: dec(e.monthlyTravelLimit), used: dec(m), remaining: dec(Prisma.Decimal.max(e.monthlyTravelLimit.minus(m), 0)) } : null,
        yearly: e.yearlyTravelLimit ? { limit: dec(e.yearlyTravelLimit), used: dec(y), remaining: dec(Prisma.Decimal.max(e.yearlyTravelLimit.minus(y), 0)) } : null,
      };
    }),
    periods: p,
  };
}

async function billing(a: AdminAccess) {
  const base = companyBookings(a);
  const [credit, corporate, invoiceSetting, transactions, byMethod, byStatus] = await Promise.all([
    getCorporateCreditAccount(a.corporateId).catch(() => null),
    prisma.corporate.findUnique({ where: { id: a.corporateId }, select: { billingCycle: true, paymentTermsDays: true, status: true } }),
    prisma.corporateInvoiceSetting.findUnique({ where: { corporateId: a.corporateId }, select: { autoGenerateInvoice: true, invoiceEmail: true, gstEnabled: true, reminderDays: true } }),
    prisma.corporateWalletTransaction.findMany({ where: { wallet: { corporateId: a.corporateId } }, select: { id: true, transactionType: true, amount: true, balanceAfter: true, referenceId: true, referenceType: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.transaction.groupBy({ by: ["paymentMethod"], where: { booking: base }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ["paymentStatus"], where: { booking: base }, _count: { _all: true }, _sum: { amount: true } }),
  ]);
  const bookingRefs = transactions.filter((t) => t.referenceType === "BOOKING" && t.referenceId).map((t) => t.referenceId!);
  const numbers = bookingRefs.length ? await prisma.booking.findMany({ where: { ...base, id: { in: bookingRefs } }, select: { id: true, bookingNumber: true } }) : [];
  const numberOf = new Map(numbers.map((b) => [b.id, b.bookingNumber]));
  return {
    credit: credit ? { enabled: credit.enabled, creditLimit: credit.creditLimit, outstanding: credit.outstanding, available: credit.availableCredit, updatedAt: credit.updatedAt, status: credit.status } : null,
    terms: { billingCycle: corporate?.billingCycle ?? null, paymentTermsDays: corporate?.paymentTermsDays ?? null },
    invoiceSetting,
    ledger: transactions.map((t) => ({ ...t, amount: dec(t.amount), balanceAfter: t.balanceAfter ? dec(t.balanceAfter) : null, bookingNumber: t.referenceId ? numberOf.get(t.referenceId) ?? null : null, bookingId: t.referenceId && numberOf.has(t.referenceId) ? t.referenceId : null })),
    payments: {
      byMethod: byMethod.map((r) => ({ method: r.paymentMethod, count: r._count._all, amount: dec(r._sum.amount) })),
      byStatus: byStatus.map((r) => ({ status: r.paymentStatus, count: r._count._all, amount: dec(r._sum.amount) })),
    },
  };
}

async function invoices(request: NextRequest, a: AdminAccess) {
  const status = param(request, "status");
  if (status && !(status in PaymentStatus)) throw new CorporateAdminError(400, "Invalid invoice status.");
  const n = pageOf(request);
  const where: Prisma.InvoiceWhereInput = { booking: companyBookings(a), ...(status ? { paymentStatus: status as PaymentStatus } : {}) };
  const [rows, total, totals] = await Promise.all([
    prisma.invoice.findMany({
      where, orderBy: [{ invoiceDate: "desc" }, { id: "asc" }], skip: (n - 1) * PAGE, take: PAGE,
      select: { id: true, invoiceNumber: true, invoiceDate: true, dueDate: true, subtotal: true, taxAmount: true, discountAmount: true, totalAmount: true, paymentStatus: true, paymentMethod: true, booking: { select: { id: true, bookingNumber: true, pickupDateTime: true } } },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({ by: ["paymentStatus"], where: { booking: companyBookings(a) }, _count: { _all: true }, _sum: { totalAmount: true } }),
  ]);
  return {
    items: rows.map((r) => ({ ...r, subtotal: dec(r.subtotal), taxAmount: dec(r.taxAmount), discountAmount: dec(r.discountAmount), totalAmount: dec(r.totalAmount), downloadUrl: `/api/corporate-admin/documents/invoice?id=${encodeURIComponent(r.id)}` })),
    page: n, pageSize: PAGE, total,
    summary: totals.map((t) => ({ status: t.paymentStatus, count: t._count._all, amount: dec(t._sum.totalAmount) })),
  };
}

const REPORT_CAP = 20000;

async function reports(request: NextRequest, a: AdminAccess) {
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 180 * 86400000);
  const from = istDate(param(request, "from"), "start date") ?? istDate(monthKey(defaultFrom) + "-01", "start date")!;
  const to = istDate(param(request, "to"), "end date", true) ?? new Date(today.getTime() + 86400000);
  if (to <= from || to.getTime() - from.getTime() > 400 * 86400000) throw new CorporateAdminError(400, "Choose a date range of up to one year.");
  const status = param(request, "status");
  if (status && !(status in BookingStatus)) throw new CorporateAdminError(400, "Invalid booking status.");
  const where: Prisma.BookingWhereInput = {
    AND: [companyBookings(a), await orgFilter(request, a), serviceFilter(param(request, "service")), { pickupDateTime: { gte: from, lt: to } }, status ? { status: status as BookingStatus } : {}],
  };
  const rows = await prisma.booking.findMany({
    where, take: REPORT_CAP + 1, orderBy: { pickupDateTime: "asc" },
    select: { status: true, pickupDateTime: true, finalFare: true, estimatedFare: true, tripType: true, pricingPackage: { select: { packageType: true } }, transactions: { select: { paymentMethod: true }, take: 1, orderBy: { createdAt: "desc" } }, customer: { select: { user: { select: { corporateEmployee: { select: employeeSummarySelect } } } } } },
  });
  const truncated = rows.length > REPORT_CAP;
  type Agg = { bookings: number; completed: number; cancelled: number; spend: Prisma.Decimal };
  const agg = () => ({ bookings: 0, completed: 0, cancelled: 0, spend: new Prisma.Decimal(0) });
  const months = new Map<string, Agg>(), depts = new Map<string, Agg & { name: string }>(), people = new Map<string, Agg & { name: string; code: string }>(), services = new Map<string, Agg>(), statuses = new Map<string, number>();
  let creditSpend = new Prisma.Decimal(0);
  const add = (t: Agg, r: (typeof rows)[number]) => {
    t.bookings++;
    if (r.status === "TRIP_COMPLETED") t.completed++;
    if (r.status === "CANCELLED") t.cancelled++; else t.spend = t.spend.plus(fare(r));
  };
  for (const r of rows.slice(0, REPORT_CAP)) {
    const e = employeeOf(r.customer.user.corporateEmployee, a.corporateId);
    const mk = monthKey(r.pickupDateTime);
    if (!months.has(mk)) months.set(mk, agg()); add(months.get(mk)!, r);
    const dk = e?.department?.id ?? "none";
    if (!depts.has(dk)) depts.set(dk, { ...agg(), name: e?.department?.name ?? "No department" }); add(depts.get(dk)!, r);
    const pk = e?.id ?? "unknown";
    if (!people.has(pk)) people.set(pk, { ...agg(), name: e?.name ?? "Unlinked traveller", code: e?.code ?? "" }); add(people.get(pk)!, r);
    // serviceOf reads only packageType and tripType.
    const sk = serviceOf(r as unknown as Parameters<typeof serviceOf>[0]);
    if (!services.has(sk)) services.set(sk, agg()); add(services.get(sk)!, r);
    statuses.set(r.status, (statuses.get(r.status) ?? 0) + 1);
    if (r.status !== "CANCELLED" && r.transactions[0]?.paymentMethod === "CORPORATE_CREDIT") creditSpend = creditSpend.plus(fare(r));
  }
  const approvalWhere = { corporateId: a.corporateId, submittedAt: { gte: from, lt: to } };
  const approvalsByStatus = await prisma.corporateApprovalRequest.groupBy({ by: ["status"], where: approvalWhere, _count: { _all: true } });
  const out = (m: Map<string, Agg & Record<string, unknown>>) => [...m.entries()].map(([key, v]) => ({ key, ...v, spend: dec(v.spend) }));
  return {
    range: { from, to },
    truncated,
    totals: { bookings: Math.min(rows.length, REPORT_CAP), spend: dec([...months.values()].reduce((s, m) => s.plus(m.spend), new Prisma.Decimal(0))), creditSpend: dec(creditSpend) },
    byMonth: out(months).sort((x, y) => x.key.localeCompare(y.key)),
    byDepartment: out(depts).sort((x, y) => Number(y.spend) - Number(x.spend)),
    byEmployee: out(people).sort((x, y) => Number(y.spend) - Number(x.spend)).slice(0, 25),
    byService: out(services),
    byStatus: [...statuses.entries()].map(([key, count]) => ({ key, count })),
    approvals: approvalsByStatus.map((r) => ({ key: r.status, count: r._count._all })),
  };
}

async function company(a: AdminAccess) {
  const c = await prisma.corporate.findUnique({
    where: { id: a.corporateId },
    select: {
      id: true, companyName: true, legalName: true, gstNumber: true, panNumber: true, email: true, mobile: true, website: true,
      address: true, city: true, state: true, country: true, pincode: true, status: true, billingCycle: true, paymentTermsDays: true,
      accountManagerName: true, accountManagerEmail: true, accountManagerMobile: true, createdAt: true,
      branches: { select: { id: true, branchName: true, city: true, isHeadOffice: true }, orderBy: [{ isHeadOffice: "desc" }, { branchName: "asc" }], take: 50 },
      _count: { select: { employees: true, branches: true, corporateDepartments: true } },
    },
  });
  if (!c) throw new CorporateAdminError(404, "Company not found.");
  return c;
}

type CommercialRow = { serviceTypes: unknown; quotationFileUrl: string | null; quotationFileName: string | null; agreementFileUrl: string | null; agreementFileName: string | null; updatedAt: Date };

// The separate commercial profile table. RideGrid-internal sales fields (tier,
// expected volume) are intentionally not returned to the company.
export async function commercialProfile(corporateId: string) {
  const rows = await prisma.$queryRaw<CommercialRow[]>`
    SELECT "serviceTypes", "quotationFileUrl", "quotationFileName", "agreementFileUrl", "agreementFileName", "updatedAt"
    FROM "CorporateCommercialProfile" WHERE "corporateId" = ${corporateId} LIMIT 1`;
  return rows[0] ?? null;
}

async function commercial(a: AdminAccess) {
  const [profile, contracts] = await Promise.all([
    commercialProfile(a.corporateId).catch(() => null),
    prisma.corporateContract.findMany({ where: { corporateId: a.corporateId }, select: { id: true, contractNumber: true, startDate: true, endDate: true, isActive: true, signedBy: true }, orderBy: { startDate: "desc" }, take: 20 }),
  ]);
  const doc = (kind: "quotation" | "agreement", url: string | null, name: string | null) =>
    url ? { kind, fileName: name || `${kind}.pdf`, url: `/api/corporate-admin/documents/${kind}` } : null;
  return {
    serviceTypes: Array.isArray(profile?.serviceTypes) ? (profile!.serviceTypes as unknown[]).filter((s): s is string => typeof s === "string") : [],
    quotation: profile ? doc("quotation", profile.quotationFileUrl, profile.quotationFileName) : null,
    agreement: profile ? doc("agreement", profile.agreementFileUrl, profile.agreementFileName) : null,
    updatedAt: profile?.updatedAt ?? null,
    contracts,
  };
}

async function admins(a: AdminAccess) {
  const [users, approvers, rules] = await Promise.all([
    prisma.user.findMany({ where: { role: "CORPORATE_ADMIN", deletedAt: null, corporateEmployee: { is: { corporateId: a.corporateId } } }, select: { id: true, name: true, email: true, isActive: true, corporateEmployee: { select: { id: true, designation: true, isActive: true } } }, orderBy: { name: "asc" }, take: 100 }),
    prisma.corporateEmployee.findMany({ where: { corporateId: a.corporateId, isApprover: true }, select: { ...employeeSummarySelect, officialEmail: true }, orderBy: { employeeName: "asc" }, take: 200 }),
    prisma.corporateApprovalRule.findMany({ where: { corporateId: a.corporateId, isActive: true }, select: { level: true, approverDesignation: true, maxAmount: true }, orderBy: { level: "asc" } }),
  ]);
  return {
    admins: users.map((u) => ({ userId: u.id, name: u.name, email: u.email, active: u.isActive && !!u.corporateEmployee?.isActive, employeeId: u.corporateEmployee?.id ?? null, designation: u.corporateEmployee?.designation ?? null, isSelf: u.id === a.user.id })),
    approvers: approvers.map((e) => ({ ...employeeOf(e, a.corporateId)!, email: e.officialEmail })),
    stages: rules.map((r) => ({ ...r, maxAmount: r.maxAmount?.toFixed(2) ?? null })),
  };
}

async function notifications(request: NextRequest, a: AdminAccess) {
  const n = pageOf(request);
  const unreadOnly = param(request, "unread") === "1";
  const where: Prisma.NotificationWhereInput = { userId: a.user.id, ...(unreadOnly ? { readAt: null } : {}) };
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (n - 1) * 30, take: 31, select: { id: true, title: true, message: true, readAt: true, createdAt: true } }),
    prisma.notification.count({ where: { userId: a.user.id, readAt: null } }),
  ]);
  return { items: items.slice(0, 30), unread, page: n, hasMore: items.length > 30 };
}

async function support(a: AdminAccess) {
  const c = await prisma.corporate.findUnique({ where: { id: a.corporateId }, select: { accountManagerName: true, accountManagerEmail: true, accountManagerMobile: true } });
  return {
    name: WELLCABS.name, phone: WELLCABS.phone, phoneHref: WELLCABS.phoneHref, email: WELLCABS.email, emailHref: WELLCABS.emailHref, whatsapp: WELLCABS.whatsapp,
    accountManager: c?.accountManagerName ? { name: c.accountManagerName, email: c.accountManagerEmail, mobile: c.accountManagerMobile } : null,
  };
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
    case "policy": return policyView(a);
    case "workflow": return workflow(a);
    case "budgets": return budgets(a);
    case "billing": return billing(a);
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
