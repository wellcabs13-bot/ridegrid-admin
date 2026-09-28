import { AuditAction, BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, AccountLifecycleError } from "@/lib/services/admin/AccountLifecycleService";
import { paymentTotals, REVENUE_STATUSES, UPCOMING_STATUSES } from "@/lib/services/admin/metrics";

// Unified admin view of everyone who travels with RideGrid: retail customers
// (Customer) and corporate travellers (CorporateEmployee). The two models stay
// separate; this service only reads them side by side.

export type PersonType = "RETAIL" | "CORPORATE";
export type PeopleFilters = { type?: string; status?: string; q?: string; corporateId?: string; page?: number; pageSize?: number };

const DELETED_EMAIL = "@deleted.ridegrid.invalid";

function retailWhere(f: PeopleFilters): Prisma.CustomerWhereInput {
  const q = f.q?.trim();
  return {
    user: {
      role: "CUSTOMER",
      ...(f.status === "SUSPENDED" ? { isActive: false, deletedAt: null } : f.status === "DELETED" ? { deletedAt: { not: null } } : f.status === "ACTIVE" ? { isActive: true, deletedAt: null } : { deletedAt: null }),
    },
    ...(f.status === "DELETED" ? {} : { deletedAt: null }),
    ...(q ? { OR: [
      { firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } }, { user: { mobile: { contains: q } } },
    ] } : {}),
  };
}

function employeeWhere(f: PeopleFilters): Prisma.CorporateEmployeeWhereInput {
  const q = f.q?.trim();
  return {
    ...(f.status === "DELETED" ? { officialEmail: { endsWith: DELETED_EMAIL } } : { officialEmail: { not: { endsWith: DELETED_EMAIL } } }),
    ...(f.status === "SUSPENDED" ? { isActive: false } : f.status === "ACTIVE" ? { isActive: true } : {}),
    ...(f.corporateId ? { corporateId: f.corporateId } : {}),
    corporate: { deletedAt: null },
    ...(q ? { OR: [
      { employeeName: { contains: q, mode: "insensitive" } }, { officialEmail: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q } }, { employeeCode: { contains: q, mode: "insensitive" } },
    ] } : {}),
  };
}

type Stats = { total: number; completed: number; cancelled: number; value: number; lastTrip: Date | null; upcoming: number };

async function bookingStats(customerIds: string[]) {
  const map = new Map<string, Stats>();
  if (!customerIds.length) return map;
  const [byStatus, upcoming] = await Promise.all([
    prisma.booking.groupBy({ by: ["customerId", "status"], where: { customerId: { in: customerIds } }, _count: { _all: true }, _sum: { finalFare: true }, _max: { pickupDateTime: true } }),
    prisma.booking.groupBy({ by: ["customerId"], where: { customerId: { in: customerIds }, deletedAt: null, status: { in: UPCOMING_STATUSES }, pickupDateTime: { gte: new Date() } }, _count: { _all: true } }),
  ]);
  for (const row of byStatus) {
    const s = map.get(row.customerId) ?? { total: 0, completed: 0, cancelled: 0, value: 0, lastTrip: null, upcoming: 0 };
    if (row.status !== BookingStatus.AWAITING_PAYMENT) s.total += row._count._all;
    if (row.status === BookingStatus.TRIP_COMPLETED) {
      s.completed += row._count._all;
      if (row._max.pickupDateTime && (!s.lastTrip || row._max.pickupDateTime > s.lastTrip)) s.lastTrip = row._max.pickupDateTime;
    }
    if (row.status === BookingStatus.CANCELLED) s.cancelled += row._count._all;
    if (REVENUE_STATUSES.includes(row.status)) s.value += Number(row._sum.finalFare ?? 0);
    map.set(row.customerId, s);
  }
  for (const row of upcoming) { const s = map.get(row.customerId); if (s) s.upcoming = row._count._all; }
  return map;
}

const empty: Stats = { total: 0, completed: 0, cancelled: 0, value: 0, lastTrip: null, upcoming: 0 };

export async function listPeople(f: PeopleFilters) {
  const pageSize = Math.min(Math.max(f.pageSize || 25, 5), 100), page = Math.max(f.page || 1, 1);
  const wantRetail = f.type !== "CORPORATE" && !f.corporateId, wantCorporate = f.type !== "RETAIL";
  const take = page * pageSize;
  const [retailCount, corporateCount, retail, employees] = await Promise.all([
    wantRetail ? prisma.customer.count({ where: retailWhere(f) }) : 0,
    wantCorporate ? prisma.corporateEmployee.count({ where: employeeWhere(f) }) : 0,
    wantRetail ? prisma.customer.findMany({ where: retailWhere(f), orderBy: { createdAt: "desc" }, take, select: { id: true, firstName: true, lastName: true, createdAt: true, deletedAt: true, user: { select: { email: true, mobile: true, isActive: true, deletedAt: true } } } }) : [],
    wantCorporate ? prisma.corporateEmployee.findMany({ where: employeeWhere(f), orderBy: { createdAt: "desc" }, take, select: { id: true, userId: true, employeeName: true, officialEmail: true, mobile: true, isActive: true, createdAt: true, designation: true, corporate: { select: { id: true, companyName: true } }, department: { select: { departmentName: true } }, branch: { select: { branchName: true } }, user: { select: { role: true, isActive: true } } } }) : [],
  ]);
  const merged = [
    ...retail.map(c => ({ kind: "RETAIL" as const, createdAt: c.createdAt, c })),
    ...employees.map(e => ({ kind: "CORPORATE" as const, createdAt: e.createdAt, e })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice((page - 1) * pageSize, page * pageSize);

  // Corporate travellers book through their own Customer profile (by userId).
  const employeeUserIds = merged.flatMap(m => (m.kind === "CORPORATE" && m.e.userId ? [m.e.userId] : []));
  const employeeCustomers = employeeUserIds.length ? await prisma.customer.findMany({ where: { userId: { in: employeeUserIds } }, select: { id: true, userId: true } }) : [];
  const customerIdByUser = new Map(employeeCustomers.map(c => [c.userId, c.id]));
  const ids = merged.map(m => (m.kind === "RETAIL" ? m.c.id : m.e.userId ? customerIdByUser.get(m.e.userId) : undefined)).filter((v): v is string => !!v);
  const stats = await bookingStats(ids);

  const rows = merged.map(m => {
    if (m.kind === "RETAIL") {
      const c = m.c;
      const status = c.deletedAt || c.user.deletedAt ? "DELETED" : c.user.isActive ? "ACTIVE" : "SUSPENDED";
      return { kind: m.kind, id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), email: status === "DELETED" ? "—" : c.user.email, mobile: c.user.mobile, company: null, department: null, branch: null, role: "Customer", status, createdAt: c.createdAt, stats: stats.get(c.id) ?? empty };
    }
    const e = m.e;
    const cid = e.userId ? customerIdByUser.get(e.userId) : undefined;
    const status = e.officialEmail.endsWith(DELETED_EMAIL) ? "DELETED" : e.isActive && (e.user?.isActive ?? true) ? "ACTIVE" : "SUSPENDED";
    return { kind: m.kind, id: e.id, name: e.employeeName, email: status === "DELETED" ? "—" : e.officialEmail, mobile: e.mobile || null, company: e.corporate, department: e.department?.departmentName ?? null, branch: e.branch?.branchName ?? null, role: e.user?.role === "CORPORATE_ADMIN" ? "Corporate Admin" : e.designation || "Employee", status, createdAt: e.createdAt, stats: (cid && stats.get(cid)) || empty };
  });
  const total = retailCount + corporateCount;
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), counts: { retail: retailCount, corporate: corporateCount } };
}

async function recentBookings(customerId: string | undefined) {
  if (!customerId) return [];
  const rows = await prisma.booking.findMany({
    where: { customerId }, orderBy: { pickupDateTime: "desc" }, take: 25,
    select: { id: true, bookingNumber: true, status: true, pickupDateTime: true, pickupLocation: true, dropLocation: true, finalFare: true, deletedAt: true, vendor: { select: { companyName: true } } },
  });
  return rows.map(b => ({ ...b, finalFare: Number(b.finalFare ?? 0) }));
}

export async function personDetail(kind: PersonType, id: string) {
  if (kind === "RETAIL") {
    const c = await prisma.customer.findUnique({ where: { id }, select: { id: true, firstName: true, lastName: true, createdAt: true, deletedAt: true, userId: true, user: { select: { email: true, mobile: true, isActive: true, isVerified: true, deletedAt: true, createdAt: true } } } });
    if (!c) throw new AccountLifecycleError(404, "Customer not found.");
    const [stats, bookings, payments, history] = await Promise.all([
      bookingStats([c.id]), recentBookings(c.id), paymentTotals({}, { customerId: c.id }),
      prisma.auditLog.findMany({ where: { entityName: "Customer", entityId: c.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, action: true, newValue: true, createdAt: true, user: { select: { name: true } } } }),
    ]);
    const status = c.deletedAt || c.user.deletedAt ? "DELETED" : c.user.isActive ? "ACTIVE" : "SUSPENDED";
    return { kind, id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), firstName: c.firstName, lastName: c.lastName, email: status === "DELETED" ? null : c.user.email, mobile: c.user.mobile, verified: c.user.isVerified, status, createdAt: c.createdAt, stats: stats.get(c.id) ?? empty, bookings, payments, history };
  }
  const e = await prisma.corporateEmployee.findUnique({
    where: { id },
    select: {
      id: true, userId: true, employeeName: true, employeeCode: true, officialEmail: true, mobile: true, designation: true, employeeGrade: true, managerName: true, isApprover: true, isActive: true, createdAt: true,
      monthlyTravelLimit: true, yearlyTravelLimit: true,
      corporate: { select: { id: true, companyName: true, status: true, travelPolicies: { where: { isActive: true }, select: { policyName: true, maxTripAmount: true, approvalRequired: true } } } },
      department: { select: { departmentName: true } }, branch: { select: { branchName: true, city: true } }, costCenter: { select: { name: true } },
      user: { select: { role: true, isActive: true } },
      approvalRequests: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, status: true, amount: true, bookingId: true, createdAt: true } },
    },
  });
  if (!e) throw new AccountLifecycleError(404, "Employee not found.");
  const customer = e.userId ? await prisma.customer.findUnique({ where: { userId: e.userId }, select: { id: true } }) : null;
  const [stats, bookings, history] = await Promise.all([
    customer ? bookingStats([customer.id]) : Promise.resolve(new Map<string, Stats>()), recentBookings(customer?.id),
    prisma.auditLog.findMany({ where: { entityName: "CorporateEmployee", entityId: e.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, action: true, newValue: true, createdAt: true, user: { select: { name: true } } } }),
  ]);
  const deleted = e.officialEmail.endsWith(DELETED_EMAIL);
  return {
    kind, id: e.id, name: e.employeeName, email: deleted ? null : e.officialEmail, mobile: e.mobile || null, status: deleted ? "DELETED" : e.isActive && (e.user?.isActive ?? true) ? "ACTIVE" : "SUSPENDED", createdAt: e.createdAt,
    company: { id: e.corporate.id, companyName: e.corporate.companyName, status: e.corporate.status },
    role: e.user?.role === "CORPORATE_ADMIN" ? "Corporate Admin" : "Employee", employeeCode: deleted ? null : e.employeeCode, designation: e.designation, grade: e.employeeGrade, manager: e.managerName, isApprover: e.isApprover,
    department: e.department?.departmentName ?? null, branch: e.branch ? `${e.branch.branchName}${e.branch.city ? `, ${e.branch.city}` : ""}` : null, costCenter: e.costCenter?.name ?? null,
    limits: { monthly: e.monthlyTravelLimit == null ? null : Number(e.monthlyTravelLimit), yearly: e.yearlyTravelLimit == null ? null : Number(e.yearlyTravelLimit) },
    policies: e.corporate.travelPolicies.map(p => ({ ...p, maxTripAmount: p.maxTripAmount == null ? null : Number(p.maxTripAmount) })),
    approvals: e.approvalRequests.map(a => ({ ...a, amount: a.amount == null ? null : Number(a.amount) })),
    stats: (customer && stats.get(customer.id)) || empty, bookings, history,
  };
}

// Admin profile correction for retail customers. Email/mobile stay unique among
// active accounts (enforced by the DB unique constraints).
export async function updateRetailProfile(id: string, input: { firstName?: string; lastName?: string; email?: string; mobile?: string }, actorId: string) {
  const c = await prisma.customer.findFirst({ where: { id, deletedAt: null }, select: { id: true, userId: true, firstName: true, lastName: true, user: { select: { email: true, mobile: true } } } });
  if (!c) throw new AccountLifecycleError(404, "Customer not found.");
  const firstName = input.firstName?.trim() || c.firstName, lastName = input.lastName?.trim() || c.lastName;
  const email = input.email?.trim().toLowerCase() || c.user.email;
  const mobile = input.mobile === undefined ? c.user.mobile : input.mobile.trim() || null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccountLifecycleError(400, "Enter a valid email address.");
  if (mobile && !/^\+?\d{10,13}$/.test(mobile.replace(/\s/g, ""))) throw new AccountLifecycleError(400, "Enter a valid mobile number.");
  const clash = await prisma.user.findFirst({ where: { id: { not: c.userId }, OR: [{ email }, ...(mobile ? [{ mobile }] : [])] }, select: { email: true } });
  if (clash) throw new AccountLifecycleError(409, clash.email === email ? "Another account already uses this email." : "Another account already uses this mobile number.");
  await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id: c.userId }, data: { name: `${firstName} ${lastName}`.trim(), email, mobile } });
    await tx.customer.update({ where: { id: c.id }, data: { firstName, lastName } });
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Customer", entityId: c.id, oldValue: { firstName: c.firstName, lastName: c.lastName, emailChanged: false }, newValue: { event: "PROFILE_UPDATED", firstName, lastName, emailChanged: email !== c.user.email, mobileChanged: mobile !== c.user.mobile } });
  });
}
