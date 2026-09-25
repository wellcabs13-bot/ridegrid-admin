import { CorporateBudgetPeriod, Prisma, VehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { corporateTravelPolicyService } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { AdminAccess, assertOwnCompany, auditEntry, CorporateAdminError, id, money, text } from "./access";
import { policyView } from "./read";

type Body = Record<string, unknown>;
const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,}$/;
const PHONE = /^[0-9+\-\s]{7,20}$/;

function bool(value: unknown, name: string) {
  if (typeof value !== "boolean") throw new CorporateAdminError(400, `Invalid ${name}.`);
  return value;
}

function int(value: unknown, name: string, min: number, max: number, optional = false) {
  if ((value === null || value === undefined || value === "") && optional) return null;
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) throw new CorporateAdminError(400, `Invalid ${name}.`);
  return n;
}

function email(value: unknown, name: string, optional = false) {
  const v = text(value, name, { max: 160, optional });
  if (v && !EMAIL.test(v)) throw new CorporateAdminError(400, `Invalid ${name.toLowerCase()}.`);
  return v ? v.toLowerCase() : null;
}

function phone(value: unknown, name: string, optional = false) {
  const v = text(value, name, { max: 20, optional });
  if (v && !PHONE.test(v)) throw new CorporateAdminError(400, `Invalid ${name.toLowerCase()}.`);
  return v;
}

function istDay(value: unknown, name: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CorporateAdminError(400, `Invalid ${name}.`);
  const d = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) throw new CorporateAdminError(400, `Invalid ${name}.`);
  return d;
}

// Every organisation reference must belong to the administrator's company.
async function ownOrg(a: AdminAccess, b: Body) {
  const refs = {
    branchId: has(b, "branchId") ? (b.branchId ? id(b.branchId, "branch") : null) : undefined,
    departmentId: has(b, "departmentId") ? (b.departmentId ? id(b.departmentId, "department") : null) : undefined,
    costCenterId: has(b, "costCenterId") ? (b.costCenterId ? id(b.costCenterId, "cost center") : null) : undefined,
  };
  const [branch, department, costCenter] = await Promise.all([
    refs.branchId ? prisma.corporateBranch.findFirst({ where: { id: refs.branchId, corporateId: a.corporateId }, select: { id: true } }) : null,
    refs.departmentId ? prisma.corporateDepartment.findFirst({ where: { id: refs.departmentId, corporateId: a.corporateId }, select: { id: true, branchId: true } }) : null,
    refs.costCenterId ? prisma.corporateCostCenter.findFirst({ where: { id: refs.costCenterId, corporateId: a.corporateId }, select: { id: true } }) : null,
  ]);
  if ((refs.branchId && !branch) || (refs.departmentId && !department) || (refs.costCenterId && !costCenter))
    throw new CorporateAdminError(403, "That branch, department or cost center is not part of your company.");
  return { refs, department };
}

async function decideApproval(b: Body, a: AdminAccess) {
  const action = b.action;
  if (action !== "APPROVE" && action !== "REJECT") throw new CorporateAdminError(400, "Choose a decision.");
  const requestId = id(b.id, "request");
  const remarks = typeof b.remarks === "string" ? b.remarks.trim().slice(0, 500) : "";
  if (action === "REJECT" && !remarks) throw new CorporateAdminError(400, "Add a reason for rejecting this request.");
  // The same request the employee app created; scoped to this company inside the service transaction.
  const result = await corporateApprovalService.decide({ requestId, corporateId: a.corporateId, actorUserId: a.user.id, action, remarks });
  try {
    await prisma.$transaction((tx) => auditEntry(tx, a, "UPDATE", "CorporateApprovalRequest", requestId, { status: "PENDING" }, { decision: action, resultStatus: result.status, remarks: remarks || null }));
  } catch (e) { console.error("Approval decision audit failed", e); }
  return result;
}

const EMPLOYEE_TEXT: [key: string, label: string, max: number, optional: boolean][] = [
  ["employeeName", "Employee name", 120, false], ["employeeCode", "Employee code", 40, false], ["designation", "Designation", 80, false],
  ["managerName", "Manager name", 120, true], ["employeeGrade", "Grade", 40, true], ["defaultPickupAddress", "Default pickup address", 300, true],
  ["emergencyContactName", "Emergency contact name", 120, true],
];

async function employeeData(b: Body, a: AdminAccess, creating: boolean) {
  const data: Record<string, unknown> = {};
  for (const [key, label, max, optional] of EMPLOYEE_TEXT) if (creating || has(b, key)) data[key] = text(b[key], label, { max, optional });
  if (creating || has(b, "officialEmail")) data.officialEmail = email(b.officialEmail, "Official email");
  if (creating || has(b, "mobile")) data.mobile = phone(b.mobile, "Mobile");
  if (has(b, "managerEmail")) data.managerEmail = email(b.managerEmail, "Manager email", true);
  if (has(b, "emergencyContactMobile")) data.emergencyContactMobile = phone(b.emergencyContactMobile, "Emergency contact mobile", true);
  if (has(b, "monthlyTravelLimit")) data.monthlyTravelLimit = money(b.monthlyTravelLimit, "Monthly travel limit");
  if (has(b, "yearlyTravelLimit")) data.yearlyTravelLimit = money(b.yearlyTravelLimit, "Yearly travel limit");
  if (has(b, "isApprover")) data.isApprover = bool(b.isApprover, "approver setting");
  const { refs, department } = await ownOrg(a, b);
  for (const [k, v] of Object.entries(refs)) if (v !== undefined) data[k] = v;
  return { data, refs, department };
}

async function employeeWrite(b: Body, a: AdminAccess) {
  const action = b.action;
  if (action === "CREATE") {
    const { data, department } = await employeeData(b, a, true);
    if (department?.branchId && data.branchId && department.branchId !== data.branchId)
      throw new CorporateAdminError(400, "The selected department belongs to a different branch.");
    // Login accounts are provisioned by RideGrid; the portal records the employee only.
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateEmployee.create({ data: { ...(data as Prisma.CorporateEmployeeUncheckedCreateInput), corporateId: a.corporateId, isActive: true }, select: { id: true, employeeName: true } });
      await auditEntry(tx, a, "CREATE", "CorporateEmployee", created.id, undefined, data);
      return created;
    });
  }
  const employeeId = id(b.id, "employee");
  const existing = await prisma.corporateEmployee.findFirst({ where: { id: employeeId, corporateId: a.corporateId }, select: { id: true, isActive: true, isApprover: true, branchId: true, departmentId: true, user: { select: { role: true } } } });
  if (!existing) throw new CorporateAdminError(404, "Employee not found.");
  if (action === "SET_ACTIVE") {
    const isActive = bool(b.isActive, "status");
    if (existing.id === a.adminEmployeeId) throw new CorporateAdminError(409, "You cannot change your own access.");
    if (existing.user?.role === "CORPORATE_ADMIN") throw new CorporateAdminError(403, "Administrator accounts are managed by RideGrid support.");
    return prisma.$transaction(async (tx) => {
      await tx.corporateEmployee.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data: { isActive } });
      await auditEntry(tx, a, "UPDATE", "CorporateEmployee", existing.id, { isActive: existing.isActive }, { isActive });
      return { id: existing.id, isActive };
    });
  }
  if (action === "SET_APPROVER") {
    const isApprover = bool(b.isApprover, "approver setting");
    return prisma.$transaction(async (tx) => {
      await tx.corporateEmployee.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data: { isApprover } });
      await auditEntry(tx, a, "UPDATE", "CorporateEmployee", existing.id, { isApprover: existing.isApprover }, { isApprover });
      return { id: existing.id, isApprover };
    });
  }
  if (action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  const { data, department } = await employeeData(b, a, false);
  const branchId = data.branchId !== undefined ? data.branchId : existing.branchId;
  const dept = department ?? (data.departmentId === undefined && existing.departmentId ? await prisma.corporateDepartment.findFirst({ where: { id: existing.departmentId, corporateId: a.corporateId }, select: { branchId: true } }) : null);
  if (dept?.branchId && branchId && dept.branchId !== branchId) throw new CorporateAdminError(400, "The selected department belongs to a different branch.");
  if (!Object.keys(data).length) throw new CorporateAdminError(400, "Nothing to update.");
  return prisma.$transaction(async (tx) => {
    await tx.corporateEmployee.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data: data as Prisma.CorporateEmployeeUncheckedUpdateManyInput });
    await auditEntry(tx, a, "UPDATE", "CorporateEmployee", existing.id, undefined, data);
    return { id: existing.id };
  });
}

async function branchWrite(b: Body, a: AdminAccess) {
  const fields = (creating: boolean) => {
    const data: Record<string, unknown> = {};
    const spec: [string, string, number, boolean][] = [["branchName", "Branch name", 120, false], ["branchCode", "Branch code", 40, true], ["address", "Address", 300, false], ["city", "City", 80, true], ["state", "State", 80, false], ["pincode", "Pincode", 10, false]];
    for (const [k, label, max, optional] of spec) if (creating || has(b, k)) data[k] = text(b[k], label, { max, optional });
    if (data.pincode && !/^\d{6}$/.test(String(data.pincode))) throw new CorporateAdminError(400, "Pincode must be six digits.");
    if (has(b, "isHeadOffice")) data.isHeadOffice = bool(b.isHeadOffice, "head office setting");
    return data;
  };
  if (b.action === "CREATE") {
    const data = fields(true);
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateBranch.create({ data: { ...(data as Omit<Prisma.CorporateBranchUncheckedCreateInput, "corporateId">), corporateId: a.corporateId } as Prisma.CorporateBranchUncheckedCreateInput, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateBranch", created.id, undefined, data);
      return created;
    });
  }
  if (b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  const branchId = id(b.id, "branch");
  const data = fields(false);
  return prisma.$transaction(async (tx) => {
    const r = await tx.corporateBranch.updateMany({ where: { id: branchId, corporateId: a.corporateId }, data });
    if (r.count !== 1) throw new CorporateAdminError(404, "Branch not found.");
    await auditEntry(tx, a, "UPDATE", "CorporateBranch", branchId, undefined, data);
    return { id: branchId };
  });
}

async function departmentWrite(b: Body, a: AdminAccess) {
  const data: Record<string, unknown> = {};
  const creating = b.action === "CREATE";
  if (!creating && b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  if (creating || has(b, "departmentName")) data.departmentName = text(b.departmentName, "Department name", { max: 120 });
  if (creating || has(b, "departmentCode")) data.departmentCode = text(b.departmentCode, "Department code", { max: 40, optional: true });
  if (has(b, "branchId")) {
    const { refs } = await ownOrg(a, { branchId: b.branchId });
    data.branchId = refs.branchId ?? null;
  }
  if (creating) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateDepartment.create({ data: { ...data, corporateId: a.corporateId } as Prisma.CorporateDepartmentUncheckedCreateInput, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateDepartment", created.id, undefined, data);
      return created;
    });
  }
  const departmentId = id(b.id, "department");
  return prisma.$transaction(async (tx) => {
    const r = await tx.corporateDepartment.updateMany({ where: { id: departmentId, corporateId: a.corporateId }, data });
    if (r.count !== 1) throw new CorporateAdminError(404, "Department not found.");
    await auditEntry(tx, a, "UPDATE", "CorporateDepartment", departmentId, undefined, data);
    return { id: departmentId };
  });
}

// Configures the record the shared CorporateTravelPolicyService evaluates. No evaluation happens here.
async function policyWrite(b: Body, a: AdminAccess) {
  if (b.action !== "SAVE") throw new CorporateAdminError(400, "Unsupported action.");
  const categories = b.allowedCategories;
  if (!Array.isArray(categories) || categories.length > 20 || categories.some((c) => typeof c !== "string" || !(c in VehicleCategory)))
    throw new CorporateAdminError(400, "Choose valid vehicle categories.");
  const data = {
    policyName: text(b.policyName, "Policy name", { max: 80 })!,
    maxTripAmount: money(b.maxTripAmount, "Maximum trip amount"),
    allowedCategories: [...new Set(categories as string[])],
    advanceBookingHours: int(b.advanceBookingHours, "minimum advance notice", 0, 720, true),
    nightTravelAllowed: bool(b.nightTravelAllowed, "night travel setting"),
    outstationAllowed: bool(b.outstationAllowed, "outstation setting"),
    airportTravelAllowed: bool(b.airportTravelAllowed, "airport setting"),
    approvalRequired: bool(b.approvalRequired, "approval setting"),
  };
  const current = await corporateTravelPolicyService.getActivePolicy(a.corporateId);
  await prisma.$transaction(async (tx) => {
    if (current) {
      const r = await tx.corporateTravelPolicy.updateMany({ where: { id: current.id, corporateId: a.corporateId, isActive: true }, data });
      if (r.count !== 1) throw new CorporateAdminError(409, "The policy changed. Refresh and retry.");
      await auditEntry(tx, a, "UPDATE", "CorporateTravelPolicy", current.id, {
        policyName: current.policyName, maxTripAmount: current.maxTripAmount, allowedCategories: current.allowedCategories, advanceBookingHours: current.advanceBookingHours,
        nightTravelAllowed: current.nightTravelAllowed, outstationAllowed: current.outstationAllowed, airportTravelAllowed: current.airportTravelAllowed, approvalRequired: current.approvalRequired,
      }, data);
    } else {
      const created = await tx.corporateTravelPolicy.create({ data: { ...data, corporateId: a.corporateId, isActive: true }, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateTravelPolicy", created.id, undefined, data);
    }
  });
  return policyView(a);
}

async function workflowWrite(b: Body, a: AdminAccess) {
  if (b.action === "CREATE") {
    const data = { level: int(b.level, "level", 1, 10)!, approverDesignation: text(b.approverDesignation, "Approver", { max: 80 })!, maxAmount: money(b.maxAmount, "Amount ceiling") };
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateApprovalRule.create({ data: { ...data, corporateId: a.corporateId, isActive: true }, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateApprovalRule", created.id, undefined, data);
      return created;
    });
  }
  const ruleId = id(b.id, "rule");
  const existing = await prisma.corporateApprovalRule.findFirst({ where: { id: ruleId, corporateId: a.corporateId }, select: { id: true, level: true, approverDesignation: true, maxAmount: true, isActive: true } });
  if (!existing) throw new CorporateAdminError(404, "Approval step not found.");
  const data: Record<string, unknown> = {};
  if (b.action === "SET_ACTIVE") data.isActive = bool(b.isActive, "status");
  else if (b.action === "UPDATE") {
    if (has(b, "level")) data.level = int(b.level, "level", 1, 10);
    if (has(b, "approverDesignation")) data.approverDesignation = text(b.approverDesignation, "Approver", { max: 80 });
    if (has(b, "maxAmount")) data.maxAmount = money(b.maxAmount, "Amount ceiling");
  } else throw new CorporateAdminError(400, "Unsupported action.");
  return prisma.$transaction(async (tx) => {
    await tx.corporateApprovalRule.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data });
    await auditEntry(tx, a, "UPDATE", "CorporateApprovalRule", existing.id, existing, data);
    return { id: existing.id };
  });
}

async function budgetWrite(b: Body, a: AdminAccess) {
  const threshold = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 100) throw new CorporateAdminError(400, "Alert threshold must be between 1 and 100 percent.");
    return new Prisma.Decimal(n.toFixed(2));
  };
  if (b.action === "CREATE") {
    const period = b.period;
    if (typeof period !== "string" || !(period in CorporateBudgetPeriod)) throw new CorporateAdminError(400, "Choose a budget period.");
    const allocatedAmount = money(b.allocatedAmount, "Budget amount", { optional: false })!;
    if (allocatedAmount.lte(0)) throw new CorporateAdminError(400, "Budget amount must be greater than zero.");
    const startDate = istDay(b.startDate, "start date"), endDate = istDay(b.endDate, "end date");
    if (endDate <= startDate) throw new CorporateAdminError(400, "Budget end date must be after the start date.");
    const data = { budgetName: text(b.budgetName, "Budget name", { max: 120 })!, period: period as CorporateBudgetPeriod, allocatedAmount, startDate, endDate, alertThreshold: threshold(b.alertThreshold) };
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateBudget.create({ data: { ...data, corporateId: a.corporateId }, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateBudget", created.id, undefined, data);
      return created;
    });
  }
  if (b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  const budgetId = id(b.id, "budget");
  const existing = await prisma.corporateBudget.findFirst({ where: { id: budgetId, corporateId: a.corporateId }, select: { id: true, budgetName: true, allocatedAmount: true, alertThreshold: true, startDate: true, endDate: true, status: true } });
  if (!existing) throw new CorporateAdminError(404, "Budget not found.");
  const data: Record<string, unknown> = {};
  if (has(b, "budgetName")) data.budgetName = text(b.budgetName, "Budget name", { max: 120 });
  if (has(b, "allocatedAmount")) {
    const v = money(b.allocatedAmount, "Budget amount", { optional: false })!;
    if (v.lte(0)) throw new CorporateAdminError(400, "Budget amount must be greater than zero.");
    data.allocatedAmount = v;
  }
  if (has(b, "alertThreshold")) data.alertThreshold = threshold(b.alertThreshold);
  if (has(b, "endDate")) {
    const end = istDay(b.endDate, "end date");
    if (end <= existing.startDate) throw new CorporateAdminError(400, "Budget end date must be after the start date.");
    data.endDate = end;
  }
  // Administrators may pause or resume a budget; EXHAUSTED and EXPIRED are system states.
  if (has(b, "status")) {
    if (b.status !== "ACTIVE" && b.status !== "SUSPENDED") throw new CorporateAdminError(400, "Invalid budget status.");
    data.status = b.status;
  }
  return prisma.$transaction(async (tx) => {
    await tx.corporateBudget.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data });
    await auditEntry(tx, a, "UPDATE", "CorporateBudget", existing.id, existing, data);
    return { id: existing.id };
  });
}

// Contact and address details only. Legal, tax, credit and commercial terms remain RideGrid-managed.
async function companyWrite(b: Body, a: AdminAccess) {
  if (b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  const data: Record<string, unknown> = {};
  if (has(b, "mobile")) data.mobile = phone(b.mobile, "Contact mobile");
  if (has(b, "website")) {
    const w = text(b.website, "Website", { max: 200, optional: true });
    if (w && !/^https?:\/\/[^\s]+$/i.test(w)) throw new CorporateAdminError(400, "Website must start with http:// or https://.");
    data.website = w;
  }
  const spec: [string, string, number, boolean][] = [["address", "Billing address", 300, false], ["city", "City", 80, true], ["state", "State", 80, false], ["pincode", "Pincode", 10, false]];
  for (const [k, label, max, optional] of spec) if (has(b, k)) data[k] = text(b[k], label, { max, optional });
  if (data.pincode && !/^\d{6}$/.test(String(data.pincode))) throw new CorporateAdminError(400, "Pincode must be six digits.");
  if (!Object.keys(data).length) throw new CorporateAdminError(400, "Nothing to update.");
  const before = await prisma.corporate.findUnique({ where: { id: a.corporateId }, select: { mobile: true, website: true, address: true, city: true, state: true, pincode: true } });
  return prisma.$transaction(async (tx) => {
    await tx.corporate.update({ where: { id: a.corporateId }, data, select: { id: true } });
    await auditEntry(tx, a, "UPDATE", "Corporate", a.corporateId, before, data);
    return { id: a.corporateId };
  });
}

async function notificationWrite(b: Body, a: AdminAccess) {
  const now = new Date();
  if (b.all === true) return { updated: (await prisma.notification.updateMany({ where: { userId: a.user.id, readAt: null }, data: { readAt: now } })).count };
  return { updated: (await prisma.notification.updateMany({ where: { id: id(b.id, "notification"), userId: a.user.id, readAt: null }, data: { readAt: now } })).count };
}

export async function writeAdmin(section: string, b: Body, a: AdminAccess) {
  assertOwnCompany(b, a);
  switch (section) {
    case "approvals": return decideApproval(b, a);
    case "employees": return employeeWrite(b, a);
    case "branches": return branchWrite(b, a);
    case "departments": return departmentWrite(b, a);
    case "policy": return policyWrite(b, a);
    case "workflow": return workflowWrite(b, a);
    case "budgets": return budgetWrite(b, a);
    case "company": return companyWrite(b, a);
    case "notifications": return notificationWrite(b, a);
    default: throw new CorporateAdminError(404, "Not found.");
  }
}
