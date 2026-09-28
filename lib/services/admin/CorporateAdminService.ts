import crypto from "crypto";
import { AuditAction, BookingStatus, CorporateBillingCycle, CorporateStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { passwordService } from "@/lib/auth/password";
import { AccountLifecycleError, audit } from "@/lib/services/admin/AccountLifecycleService";
import { addDays, bookingRevenue, istStartOfDay, istStartOfMonth, paymentTotals, REVENUE_STATUSES } from "@/lib/services/admin/metrics";

// Super Admin view of corporate accounts, built on the same Corporate / Employee /
// CorporateWallet / Booking records the Corporate Portal and Employee App use.

const DELETED_EMAIL = "@deleted.ridegrid.invalid";
const n = (v: Prisma.Decimal | number | null | undefined) => Number(v ?? 0);

export async function listCorporates(f: { q?: string; status?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(Math.max(f.pageSize || 25, 5), 100), page = Math.max(f.page || 1, 1);
  const q = f.q?.trim();
  const where: Prisma.CorporateWhereInput = {
    deletedAt: null,
    ...(f.status && Object.values(CorporateStatus).includes(f.status as CorporateStatus) ? { status: f.status as CorporateStatus } : {}),
    ...(q ? { OR: [{ companyName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { gstNumber: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [total, companies] = await Promise.all([
    prisma.corporate.count({ where }),
    prisma.corporate.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      select: { id: true, companyName: true, email: true, mobile: true, city: true, status: true, creditLimit: true, createdAt: true,
        wallet: { select: { balance: true, creditLimit: true } }, commercialProfile: { select: { customerTier: true } },
        employees: { where: { user: { role: UserRole.CORPORATE_ADMIN } }, orderBy: { createdAt: "asc" }, take: 1, select: { employeeName: true, officialEmail: true, mobile: true } } },
    }),
  ]);
  const ids = companies.map(c => c.id);
  const now = new Date(), today = istStartOfDay(now), month = istStartOfMonth(now);
  const has = ids.length > 0;
  const [allTime, thisMonth, tripsToday, tripsMonth, approvals, employees] = await Promise.all([
    has ? prisma.booking.groupBy({ by: ["corporateId"], where: { corporateId: { in: ids }, status: { in: REVENUE_STATUSES } }, _count: { _all: true }, _sum: { finalFare: true, taxAmount: true } }) : [],
    has ? prisma.booking.groupBy({ by: ["corporateId"], where: { corporateId: { in: ids }, status: { in: REVENUE_STATUSES }, createdAt: { gte: month } }, _count: { _all: true }, _sum: { finalFare: true, taxAmount: true } }) : [],
    has ? prisma.booking.groupBy({ by: ["corporateId"], where: { corporateId: { in: ids }, status: { in: REVENUE_STATUSES }, pickupDateTime: { gte: today, lt: addDays(today, 1) } }, _count: { _all: true } }) : [],
    has ? prisma.booking.groupBy({ by: ["corporateId"], where: { corporateId: { in: ids }, status: BookingStatus.TRIP_COMPLETED, pickupDateTime: { gte: month } }, _count: { _all: true } }) : [],
    has ? prisma.corporateApprovalRequest.groupBy({ by: ["corporateId"], where: { corporateId: { in: ids }, status: "PENDING" }, _count: { _all: true } }) : [],
    has ? prisma.corporateEmployee.groupBy({ by: ["corporateId"], where: { corporateId: { in: ids }, isActive: true, officialEmail: { not: { endsWith: DELETED_EMAIL } } }, _count: { _all: true } }) : [],
  ]);
  const pick = <T extends { corporateId: string | null }>(rows: T[], id: string) => rows.find(r => r.corporateId === id);
  const rows = companies.map(c => {
    const limit = n(c.wallet?.creditLimit ?? c.creditLimit), outstanding = n(c.wallet?.balance);
    const all = pick(allTime, c.id), mon = pick(thisMonth, c.id);
    return {
      id: c.id, companyName: c.companyName, status: c.status, city: c.city, email: c.email, mobile: c.mobile, createdAt: c.createdAt,
      tier: c.commercialProfile?.customerTier ?? null,
      primaryAdmin: c.employees[0] ? { name: c.employees[0].employeeName, email: c.employees[0].officialEmail, mobile: c.employees[0].mobile } : null,
      credit: { enabled: c.status === CorporateStatus.ACTIVE && limit > 0, limit, outstanding, available: Math.max(0, limit - outstanding) },
      bookingsThisMonth: mon?._count._all ?? 0, tripsToday: pick(tripsToday, c.id)?._count._all ?? 0, completedThisMonth: pick(tripsMonth, c.id)?._count._all ?? 0,
      totalBookings: all?._count._all ?? 0, spendThisMonth: n(mon?._sum.finalFare), gstThisMonth: n(mon?._sum.taxAmount), spendAllTime: n(all?._sum.finalFare), gstAllTime: n(all?._sum.taxAmount),
      pendingApprovals: approvals.find(a => a.corporateId === c.id)?._count._all ?? 0, employees: employees.find(e => e.corporateId === c.id)?._count._all ?? 0,
    };
  });
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function corporateDetail(id: string) {
  const c = await prisma.corporate.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true, companyName: true, legalName: true, gstNumber: true, panNumber: true, email: true, mobile: true, website: true, address: true, city: true, state: true, pincode: true,
      status: true, billingCycle: true, approvalFlow: true, creditLimit: true, paymentTermsDays: true, accountManagerName: true, accountManagerEmail: true, createdAt: true,
      wallet: { select: { id: true, balance: true, creditLimit: true, updatedAt: true, transactions: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, transactionType: true, amount: true, balanceAfter: true, referenceType: true, description: true, createdAt: true } } } },
      commercialProfile: { select: { customerTier: true, expectedMonthlyBookings: true, serviceTypes: true, agreementFileName: true, quotationFileName: true } },
      branches: { select: { id: true, branchName: true, city: true, isHeadOffice: true } },
      corporateDepartments: { select: { id: true, departmentName: true } },
      travelPolicies: { select: { id: true, policyName: true, maxTripAmount: true, approvalRequired: true, isActive: true, outstationAllowed: true, nightTravelAllowed: true } },
      budgets: { select: { id: true } },
      contracts: { select: { id: true } },
      employees: {
        where: { officialEmail: { not: { endsWith: DELETED_EMAIL } } }, orderBy: { createdAt: "asc" },
        select: { id: true, employeeName: true, employeeCode: true, officialEmail: true, mobile: true, designation: true, isApprover: true, isActive: true, userId: true, department: { select: { departmentName: true } }, branch: { select: { branchName: true } }, user: { select: { role: true, isActive: true } } },
      },
    },
  });
  if (!c) throw new AccountLifecycleError(404, "Corporate account not found.");
  const month = istStartOfMonth();
  const [monthRevenue, allRevenue, payments, approvals, bookings, history] = await Promise.all([
    bookingRevenue({ from: month }, { corporateId: id }), bookingRevenue({}, { corporateId: id }), paymentTotals({}, { corporateId: id }),
    prisma.corporateApprovalRequest.findMany({ where: { corporateId: id }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, status: true, amount: true, bookingId: true, currentStage: true, createdAt: true, employee: { select: { employeeName: true } } } }),
    prisma.booking.findMany({ where: { corporateId: id }, orderBy: { pickupDateTime: "desc" }, take: 25, select: { id: true, bookingNumber: true, status: true, pickupDateTime: true, finalFare: true, taxAmount: true, deletedAt: true, customer: { select: { firstName: true, lastName: true } }, vendor: { select: { companyName: true } } } }),
    prisma.auditLog.findMany({ where: { OR: [{ entityName: "Corporate", entityId: id }, { newValue: { path: ["corporateId"], equals: id } }] }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, action: true, entityName: true, newValue: true, createdAt: true, user: { select: { name: true } } } }),
  ]);
  const limit = n(c.wallet?.creditLimit ?? c.creditLimit), outstanding = n(c.wallet?.balance);
  return {
    ...c, creditLimit: c.creditLimit == null ? null : n(c.creditLimit),
    wallet: c.wallet ? { ...c.wallet, balance: n(c.wallet.balance), creditLimit: c.wallet.creditLimit == null ? null : n(c.wallet.creditLimit), transactions: c.wallet.transactions.map(t => ({ ...t, amount: n(t.amount), balanceAfter: t.balanceAfter == null ? null : n(t.balanceAfter) })) } : null,
    travelPolicies: c.travelPolicies.map(p => ({ ...p, maxTripAmount: p.maxTripAmount == null ? null : n(p.maxTripAmount) })),
    employees: c.employees.map(e => ({ id: e.id, name: e.employeeName, code: e.employeeCode, email: e.officialEmail, mobile: e.mobile, designation: e.designation, department: e.department?.departmentName ?? null, branch: e.branch?.branchName ?? null, isApprover: e.isApprover, active: e.isActive, role: e.user?.role ?? null, hasLogin: !!e.userId, loginActive: e.user?.isActive ?? false })),
    credit: { enabled: c.status === CorporateStatus.ACTIVE && limit > 0, limit, outstanding, available: Math.max(0, limit - outstanding) },
    finance: { month: monthRevenue, allTime: allRevenue, payments },
    counts: { budgets: c.budgets.length, contracts: c.contracts.length },
    approvals: approvals.map(a => ({ ...a, amount: a.amount == null ? null : n(a.amount), employee: a.employee.employeeName })),
    bookings: bookings.map(b => ({ id: b.id, bookingNumber: b.bookingNumber, status: b.status, pickupDateTime: b.pickupDateTime, total: n(b.finalFare), gst: n(b.taxAmount), archived: !!b.deletedAt, traveller: `${b.customer.firstName} ${b.customer.lastName}`.trim(), vendor: b.vendor.companyName })),
    history,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE = /^\+?\d{10,13}$/;

export type CreateCorporateInput = {
  companyName: string; legalName?: string; gstNumber?: string; email: string; mobile: string; address: string; city: string; state: string; pincode: string;
  billingCycle?: string; creditLimit?: number; paymentTermsDays?: number; requireApproval?: boolean;
  admin: { name: string; email: string; mobile: string; designation?: string };
};

// Creates the company, its primary Corporate Admin (login + employee profile), the
// Corporate Credit account and (optionally) an approval-required travel policy.
// The temporary password is returned once and never stored in plain text.
export async function createCorporate(input: CreateCorporateInput, actorId: string) {
  const need = (v: string | undefined, label: string) => { if (!v?.trim()) throw new AccountLifecycleError(400, `${label} is required.`); return v.trim(); };
  const companyName = need(input.companyName, "Company name"), address = need(input.address, "Address"), city = need(input.city, "City"), state = need(input.state, "State"), pincode = need(input.pincode, "PIN code");
  const email = need(input.email, "Company email").toLowerCase(), mobile = need(input.mobile, "Company mobile").replace(/\s/g, "");
  const adminName = need(input.admin?.name, "Admin name"), adminEmail = need(input.admin?.email, "Admin email").toLowerCase(), adminMobile = need(input.admin?.mobile, "Admin mobile").replace(/\s/g, "");
  if (!EMAIL.test(email) || !EMAIL.test(adminEmail)) throw new AccountLifecycleError(400, "Enter valid email addresses.");
  if (!MOBILE.test(mobile) || !MOBILE.test(adminMobile)) throw new AccountLifecycleError(400, "Enter valid 10-digit mobile numbers.");
  if (!/^\d{6}$/.test(pincode)) throw new AccountLifecycleError(400, "PIN code must be 6 digits.");
  const creditLimit = Number(input.creditLimit ?? 0);
  if (!Number.isFinite(creditLimit) || creditLimit < 0) throw new AccountLifecycleError(400, "Credit limit must be zero or more.");
  const gstNumber = input.gstNumber?.trim().toUpperCase() || null;
  if (gstNumber && !/^[0-9A-Z]{15}$/.test(gstNumber)) throw new AccountLifecycleError(400, "GSTIN must be 15 characters.");
  const billingCycle = Object.values(CorporateBillingCycle).includes(input.billingCycle as CorporateBillingCycle) ? (input.billingCycle as CorporateBillingCycle) : CorporateBillingCycle.MONTHLY;

  const [companyClash, userClash, employeeClash] = await Promise.all([
    prisma.corporate.findFirst({ where: { OR: [{ email }, ...(gstNumber ? [{ gstNumber }] : [])] }, select: { email: true } }),
    prisma.user.findFirst({ where: { OR: [{ email: adminEmail }, { mobile: adminMobile }] }, select: { email: true } }),
    prisma.corporateEmployee.findFirst({ where: { officialEmail: adminEmail }, select: { id: true } }),
  ]);
  if (companyClash) throw new AccountLifecycleError(409, companyClash.email === email ? "A company with this email already exists." : "A company with this GSTIN already exists.");
  if (userClash || employeeClash) throw new AccountLifecycleError(409, userClash?.email === adminEmail || employeeClash ? "The admin email is already used by another account." : "The admin mobile is already used by another account.");

  const temporaryPassword = passwordService.generateTemporaryPassword(14);
  const passwordHash = await passwordService.hash(temporaryPassword);
  const created = await prisma.$transaction(async tx => {
    const corporate = await tx.corporate.create({ data: {
      companyName, legalName: input.legalName?.trim() || null, gstNumber, email, mobile, address, city, state, pincode, country: "India",
      status: CorporateStatus.ACTIVE, billingCycle, creditLimit: creditLimit || null, paymentTermsDays: input.paymentTermsDays ?? 30,
    } });
    await tx.corporateWallet.create({ data: { corporateId: corporate.id, balance: 0, creditLimit: creditLimit || null } });
    const user = await tx.user.create({ data: { name: adminName, email: adminEmail, mobile: adminMobile, password: passwordHash, role: UserRole.CORPORATE_ADMIN, isActive: true, isVerified: false } });
    const employee = await tx.corporateEmployee.create({ data: {
      corporateId: corporate.id, userId: user.id, employeeCode: `ADM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      employeeName: adminName, officialEmail: adminEmail, mobile: adminMobile, designation: input.admin.designation?.trim() || "Corporate Admin", isApprover: true, isActive: true,
    } });
    if (input.requireApproval) await tx.corporateTravelPolicy.create({ data: { corporateId: corporate.id, policyName: "Default policy", approvalRequired: true, isActive: true } });
    await audit(tx, { actorId, action: AuditAction.CREATE, entityName: "Corporate", entityId: corporate.id, newValue: { event: "CORPORATE_ONBOARDED", corporateId: corporate.id, adminEmployeeId: employee.id, creditLimit, requireApproval: !!input.requireApproval } });
    return { corporateId: corporate.id, adminEmail };
  });
  return { ...created, temporaryPassword };
}

export async function updateCorporate(id: string, input: { status?: string; creditLimit?: number; billingCycle?: string; paymentTermsDays?: number }, actorId: string, reason?: string) {
  const c = await prisma.corporate.findFirst({ where: { id, deletedAt: null }, select: { id: true, status: true, creditLimit: true, wallet: { select: { id: true, balance: true } } } });
  if (!c) throw new AccountLifecycleError(404, "Corporate account not found.");
  const data: Prisma.CorporateUpdateInput = {};
  if (input.status !== undefined) {
    if (!Object.values(CorporateStatus).includes(input.status as CorporateStatus)) throw new AccountLifecycleError(400, "Invalid status.");
    if (input.status !== "ACTIVE" && !reason) throw new AccountLifecycleError(400, "A reason is required to deactivate or suspend a company.");
    data.status = input.status as CorporateStatus;
  }
  if (input.creditLimit !== undefined) {
    if (!Number.isFinite(input.creditLimit) || input.creditLimit < 0) throw new AccountLifecycleError(400, "Credit limit must be zero or more.");
    if (c.wallet && input.creditLimit < n(c.wallet.balance)) throw new AccountLifecycleError(409, `Credit limit cannot be below the current outstanding (₹${n(c.wallet.balance).toLocaleString("en-IN")}).`);
    data.creditLimit = input.creditLimit;
  }
  if (input.billingCycle !== undefined) {
    if (!Object.values(CorporateBillingCycle).includes(input.billingCycle as CorporateBillingCycle)) throw new AccountLifecycleError(400, "Invalid billing cycle.");
    data.billingCycle = input.billingCycle as CorporateBillingCycle;
  }
  if (input.paymentTermsDays !== undefined) {
    if (!Number.isInteger(input.paymentTermsDays) || input.paymentTermsDays < 0 || input.paymentTermsDays > 180) throw new AccountLifecycleError(400, "Payment terms must be 0–180 days.");
    data.paymentTermsDays = input.paymentTermsDays;
  }
  if (!Object.keys(data).length) throw new AccountLifecycleError(400, "No changes to save.");
  await prisma.$transaction(async tx => {
    await tx.corporate.update({ where: { id }, data });
    if (input.creditLimit !== undefined) {
      if (c.wallet) await tx.corporateWallet.update({ where: { id: c.wallet.id }, data: { creditLimit: input.creditLimit } });
      else await tx.corporateWallet.create({ data: { corporateId: id, balance: 0, creditLimit: input.creditLimit } });
    }
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Corporate", entityId: id, oldValue: { status: c.status, creditLimit: c.creditLimit == null ? null : n(c.creditLimit) }, newValue: { ...input, reason: reason || null, corporateId: id } });
  });
}

// Corporate Portal records employees without a login; RideGrid provisions the
// Employee App login here. The temporary password is shown once.
export async function provisionEmployeeLogin(corporateId: string, employeeId: string, actorId: string) {
  const e = await prisma.corporateEmployee.findFirst({ where: { id: employeeId, corporateId }, select: { id: true, userId: true, isActive: true, employeeName: true, officialEmail: true, mobile: true, corporate: { select: { status: true, deletedAt: true } } } });
  if (!e || e.officialEmail.endsWith(DELETED_EMAIL)) throw new AccountLifecycleError(404, "Employee not found.");
  if (!e.isActive) throw new AccountLifecycleError(409, "Activate the employee before creating a login.");
  if (e.corporate.deletedAt || e.corporate.status !== CorporateStatus.ACTIVE) throw new AccountLifecycleError(409, "The company account is not active.");
  if (e.userId) throw new AccountLifecycleError(409, "This employee already has a login.");
  const mobile = e.mobile?.replace(/\s/g, "") || null;
  const clash = await prisma.user.findFirst({ where: { OR: [{ email: e.officialEmail }, ...(mobile ? [{ mobile }] : [])] }, select: { email: true } });
  if (clash) throw new AccountLifecycleError(409, clash.email === e.officialEmail ? "Another account already uses this email." : "Another account already uses this mobile number.");
  const temporaryPassword = passwordService.generateTemporaryPassword(14);
  const hash = await passwordService.hash(temporaryPassword);
  await prisma.$transaction(async tx => {
    const user = await tx.user.create({ data: { name: e.employeeName, email: e.officialEmail, mobile, password: hash, role: UserRole.CORPORATE_EMPLOYEE, isActive: true, isVerified: false } });
    const linked = await tx.corporateEmployee.updateMany({ where: { id: e.id, userId: null }, data: { userId: user.id } });
    if (linked.count !== 1) throw new AccountLifecycleError(409, "This employee already has a login.");
    await audit(tx, { actorId, action: AuditAction.CREATE, entityName: "CorporateEmployee", entityId: e.id, newValue: { event: "LOGIN_PROVISIONED", corporateId } });
  });
  return { email: e.officialEmail, temporaryPassword };
}
