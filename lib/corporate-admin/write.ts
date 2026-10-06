import { CorporateBudgetPeriod, Prisma, VehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { findIdentityClash, normalizeMobile } from "@/lib/auth/identity";
import { APPROVER_LABEL, APPROVER_TYPES, corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { corporateTravelPolicyService, policyServiceType } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { assertBudgetFits } from "@/lib/services/corporate/CorporateBudgetService";
import { provisionEmployeeLogin } from "@/lib/services/admin/CorporateAdminService";
import { cancelBooking, updateBooking } from "@/lib/services/admin/BookingAdminService";
import { AdminAccess, assertOwnCompany, auditEntry, CorporateAdminError, id, money, text } from "./access";
import { policies } from "./read";
import { createTicket } from "./support";

type Body = Record<string, unknown>;
const has = (b: Body, k: string) => Object.prototype.hasOwnProperty.call(b, k);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,}$/;
const PHONE = /^[0-9+\-\s]{7,20}$/;
const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

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

function gstin(value: unknown, optional = true) {
  const v = text(value, "GSTIN", { max: 15, optional });
  if (v && !GSTIN.test(v.toUpperCase())) throw new CorporateAdminError(400, "Enter a valid 15-character GSTIN.");
  return v ? v.toUpperCase() : null;
}

function pincode(value: unknown, name = "Pincode", optional = false) {
  const v = text(value, name, { max: 10, optional });
  if (v && !/^\d{6}$/.test(v)) throw new CorporateAdminError(400, `${name} must be six digits.`);
  return v;
}

function istDay(value: unknown, name: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new CorporateAdminError(400, `Invalid ${name}.`);
  const d = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(d.getTime())) throw new CorporateAdminError(400, `Invalid ${name}.`);
  return d;
}

const optionalId = (b: Body, k: string, label: string) => (has(b, k) ? (b[k] ? id(b[k], label) : null) : undefined);

// Every organisation reference must belong to the administrator's company. New
// assignments must point at active branches, departments and employees.
async function ownOrg(a: AdminAccess, b: Body) {
  const refs = {
    branchId: optionalId(b, "branchId", "branch"), departmentId: optionalId(b, "departmentId", "department"),
    costCenterId: optionalId(b, "costCenterId", "cost center"),
  };
  const [branch, department, costCenter] = await Promise.all([
    refs.branchId ? prisma.corporateBranch.findFirst({ where: { id: refs.branchId, corporateId: a.corporateId }, select: { id: true, isActive: true } }) : null,
    refs.departmentId ? prisma.corporateDepartment.findFirst({ where: { id: refs.departmentId, corporateId: a.corporateId }, select: { id: true, branchId: true, isActive: true } }) : null,
    refs.costCenterId ? prisma.corporateCostCenter.findFirst({ where: { id: refs.costCenterId, corporateId: a.corporateId }, select: { id: true } }) : null,
  ]);
  if ((refs.branchId && !branch) || (refs.departmentId && !department) || (refs.costCenterId && !costCenter))
    throw new CorporateAdminError(403, "That branch, department or cost center is not part of your company.");
  if ((branch && !branch.isActive) || (department && !department.isActive)) throw new CorporateAdminError(409, "Choose an active branch and department.");
  return { refs, department };
}

// An employee reference (manager, approver, head) inside the same company.
async function ownEmployee(a: AdminAccess, value: unknown, label: string) {
  if (value === null || value === undefined || value === "") return null;
  const e = await prisma.corporateEmployee.findFirst({ where: { id: id(value, label), corporateId: a.corporateId }, select: { id: true, isActive: true } });
  if (!e) throw new CorporateAdminError(403, `That ${label} is not part of your company.`);
  if (!e.isActive) throw new CorporateAdminError(409, `The selected ${label} is inactive.`);
  return e.id;
}

async function ownPolicy(a: AdminAccess, value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const p = await prisma.corporateTravelPolicy.findFirst({ where: { id: id(value, "policy"), corporateId: a.corporateId, isActive: true }, select: { id: true } });
  if (!p) throw new CorporateAdminError(403, "That travel policy is not an active policy of your company.");
  return p.id;
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
  ["employeeName", "Employee name", 120, false], ["employeeCode", "Employee ID", 40, false], ["designation", "Designation", 80, false],
  ["managerName", "Manager name", 120, true], ["employeeGrade", "Grade", 40, true], ["defaultPickupAddress", "Default pickup address", 300, true],
  ["emergencyContactName", "Emergency contact name", 120, true],
];

async function employeeData(b: Body, a: AdminAccess, creating: boolean, selfId?: string) {
  const data: Record<string, unknown> = {};
  for (const [key, label, max, optional] of EMPLOYEE_TEXT) if (creating || has(b, key)) data[key] = text(b[key], label, { max, optional });
  if (creating || has(b, "officialEmail")) data.officialEmail = email(b.officialEmail, "Official email");
  if (creating || has(b, "mobile")) data.mobile = phone(b.mobile, "Mobile");
  if (has(b, "managerEmail")) data.managerEmail = email(b.managerEmail, "Manager email", true);
  if (has(b, "emergencyContactMobile")) data.emergencyContactMobile = phone(b.emergencyContactMobile, "Emergency contact mobile", true);
  if (has(b, "monthlyTravelLimit")) data.monthlyTravelLimit = money(b.monthlyTravelLimit, "Monthly travel limit");
  if (has(b, "yearlyTravelLimit")) data.yearlyTravelLimit = money(b.yearlyTravelLimit, "Yearly travel limit");
  if (has(b, "isApprover")) data.isApprover = bool(b.isApprover, "approver setting");
  if (has(b, "canBook")) data.canBook = bool(b.canBook, "booking permission");
  for (const [key, label] of [["reportingManagerId", "reporting manager"], ["approvalManagerId", "approval manager"]] as const) {
    if (!has(b, key)) continue;
    const v = await ownEmployee(a, b[key], label);
    if (v && v === selfId) throw new CorporateAdminError(400, `An employee cannot be their own ${label}.`);
    data[key] = v;
  }
  if (has(b, "travelPolicyId")) data.travelPolicyId = await ownPolicy(a, b.travelPolicyId);
  const { refs, department } = await ownOrg(a, b);
  for (const [k, v] of Object.entries(refs)) if (v !== undefined) data[k] = v;
  return { data, department };
}

// The official email and mobile may not already belong to another employee login
// (the same email/mobile may still be used by a customer, vendor or driver account).
async function assertIdentityFree(officialEmail: string | null | undefined, mobile: string | null | undefined, exceptUserId?: string | null) {
  const clash = await findIdentityClash({ role: "CORPORATE_EMPLOYEE", email: officialEmail, mobile, exceptUserId });
  if (clash) throw new CorporateAdminError(409, clash === "email" ? "Another employee login already uses this email." : "Another employee login already uses this mobile number.");
}

async function employeeWrite(b: Body, a: AdminAccess) {
  const action = b.action;
  if (action === "CREATE") {
    const { data, department } = await employeeData(b, a, true);
    if (department?.branchId && data.branchId && department.branchId !== data.branchId)
      throw new CorporateAdminError(400, "The selected department belongs to a different branch.");
    await assertIdentityFree(data.officialEmail as string, data.mobile as string);
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateEmployee.create({ data: { ...(data as Prisma.CorporateEmployeeUncheckedCreateInput), corporateId: a.corporateId, isActive: true }, select: { id: true, employeeName: true } });
      await auditEntry(tx, a, "CREATE", "CorporateEmployee", created.id, undefined, data);
      return created;
    });
  }
  const employeeId = id(b.id, "employee");
  const existing = await prisma.corporateEmployee.findFirst({ where: { id: employeeId, corporateId: a.corporateId }, select: { id: true, isActive: true, isApprover: true, branchId: true, departmentId: true, userId: true, officialEmail: true, mobile: true, user: { select: { role: true } } } });
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
  // Creates the Corporate Employee App login through the same central provisioning
  // Super Admin uses: one User per employee, unique email/mobile, temporary password.
  if (action === "PROVISION_LOGIN") {
    const result = await provisionEmployeeLogin(a.corporateId, existing.id, a.user.id);
    await prisma.$transaction((tx) => auditEntry(tx, a, "CREATE", "CorporateEmployee", existing.id, undefined, { event: "LOGIN_PROVISIONED" }));
    return { email: result.email, temporaryPassword: result.temporaryPassword, activationEmailSent: result.activationEmailSent };
  }
  if (action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  const { data, department } = await employeeData(b, a, false, existing.id);
  const branchId = data.branchId !== undefined ? data.branchId : existing.branchId;
  const dept = department ?? (data.departmentId === undefined && existing.departmentId ? await prisma.corporateDepartment.findFirst({ where: { id: existing.departmentId, corporateId: a.corporateId }, select: { branchId: true } }) : null);
  if (dept?.branchId && branchId && dept.branchId !== branchId) throw new CorporateAdminError(400, "The selected department belongs to a different branch.");
  // The login identity is the official email; change it through RideGrid support once a login exists.
  if (existing.userId && data.officialEmail !== undefined && data.officialEmail !== existing.officialEmail)
    throw new CorporateAdminError(409, "This employee has an app login. Contact RideGrid support to change the login email.");
  if (data.officialEmail !== undefined || data.mobile !== undefined)
    await assertIdentityFree(data.officialEmail !== existing.officialEmail ? data.officialEmail as string : null, data.mobile !== existing.mobile ? data.mobile as string : null, existing.userId);
  if (!Object.keys(data).length) throw new CorporateAdminError(400, "Nothing to update.");
  return prisma.$transaction(async (tx) => {
    await tx.corporateEmployee.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data: data as Prisma.CorporateEmployeeUncheckedUpdateManyInput });
    if (existing.userId && data.mobile !== undefined && data.mobile !== existing.mobile)
      await tx.user.updateMany({ where: { id: existing.userId, role: "CORPORATE_EMPLOYEE" }, data: { mobile: normalizeMobile(data.mobile as string) } });
    await auditEntry(tx, a, "UPDATE", "CorporateEmployee", existing.id, undefined, data);
    return { id: existing.id };
  });
}

async function branchWrite(b: Body, a: AdminAccess) {
  const fields = (creating: boolean) => {
    const data: Record<string, unknown> = {};
    const spec: [string, string, number, boolean][] = [["branchName", "Branch name", 120, false], ["branchCode", "Branch code", 40, true], ["address", "Address", 300, false], ["city", "City", 80, true], ["state", "State", 80, false], ["contactName", "Contact person", 120, true]];
    for (const [k, label, max, optional] of spec) if (creating || has(b, k)) data[k] = text(b[k], label, { max, optional });
    if (creating || has(b, "pincode")) data.pincode = pincode(b.pincode);
    if (has(b, "contactPhone")) data.contactPhone = phone(b.contactPhone, "Contact phone", true);
    if (has(b, "contactEmail")) data.contactEmail = email(b.contactEmail, "Contact email", true);
    if (has(b, "gstNumber")) data.gstNumber = gstin(b.gstNumber);
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
  const branchId = id(b.id, "branch");
  if (b.action === "SET_ACTIVE") {
    const isActive = bool(b.isActive, "status");
    return prisma.$transaction(async (tx) => {
      const r = await tx.corporateBranch.updateMany({ where: { id: branchId, corporateId: a.corporateId }, data: { isActive } });
      if (r.count !== 1) throw new CorporateAdminError(404, "Branch not found.");
      await auditEntry(tx, a, "UPDATE", "CorporateBranch", branchId, undefined, { isActive });
      return { id: branchId, isActive };
    });
  }
  if (b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
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
  if (b.action === "SET_ACTIVE") {
    const departmentId = id(b.id, "department"), isActive = bool(b.isActive, "status");
    return prisma.$transaction(async (tx) => {
      const r = await tx.corporateDepartment.updateMany({ where: { id: departmentId, corporateId: a.corporateId }, data: { isActive } });
      if (r.count !== 1) throw new CorporateAdminError(404, "Department not found.");
      await auditEntry(tx, a, "UPDATE", "CorporateDepartment", departmentId, undefined, { isActive });
      return { id: departmentId, isActive };
    });
  }
  if (!creating && b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  if (creating || has(b, "departmentName")) data.departmentName = text(b.departmentName, "Department name", { max: 120 });
  if (creating || has(b, "departmentCode")) data.departmentCode = text(b.departmentCode, "Department code", { max: 40, optional: true });
  if (has(b, "branchId")) {
    const { refs } = await ownOrg(a, { branchId: b.branchId });
    data.branchId = refs.branchId ?? null;
  }
  if (has(b, "headEmployeeId")) data.headEmployeeId = await ownEmployee(a, b.headEmployeeId, "department head");
  if (has(b, "approverEmployeeId")) data.approverEmployeeId = await ownEmployee(a, b.approverEmployeeId, "department approver");
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

const POLICY_AUDIT_KEYS = ["policyName", "maxTripAmount", "blockAboveAmount", "allowedCategories", "allowedCities", "advanceBookingHours", "nightTravelAllowed", "outstationAllowed", "airportTravelAllowed", "localAllowed", "roundTripAllowed", "weekendTravelAllowed", "bookingStartHour", "bookingEndHour", "approvalRequired", "description", "branchId", "departmentId"] as const;

// Configures the records the shared CorporateTravelPolicyService evaluates. No evaluation happens here.
async function policyWrite(b: Body, a: AdminAccess) {
  if (b.action === "SET_ACTIVE") {
    const policyId = id(b.id, "policy"), isActive = bool(b.isActive, "status");
    const existing = await prisma.corporateTravelPolicy.findFirst({ where: { id: policyId, corporateId: a.corporateId }, select: { id: true, branchId: true, departmentId: true } });
    if (!existing) throw new CorporateAdminError(404, "Policy not found.");
    await prisma.$transaction(async (tx) => {
      await tx.corporateTravelPolicy.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data: { isActive } });
      // Employees assigned to a retired policy fall back to their department/branch/company policy.
      if (!isActive) await tx.corporateEmployee.updateMany({ where: { corporateId: a.corporateId, travelPolicyId: existing.id }, data: { travelPolicyId: null } });
      await auditEntry(tx, a, "UPDATE", "CorporateTravelPolicy", existing.id, undefined, { isActive });
    });
    return policies(a);
  }
  if (b.action !== "SAVE") throw new CorporateAdminError(400, "Unsupported action.");
  const categories = b.allowedCategories;
  if (!Array.isArray(categories) || categories.length > 20 || categories.some((c) => typeof c !== "string" || !(c in VehicleCategory)))
    throw new CorporateAdminError(400, "Choose valid vehicle categories.");
  const cities = b.allowedCities ?? [];
  if (!Array.isArray(cities) || cities.length > 50 || cities.some((c) => typeof c !== "string" || !c.trim() || c.length > 80))
    throw new CorporateAdminError(400, "Choose valid cities.");
  const optBool = (k: string, fallback: boolean) => (has(b, k) ? bool(b[k], k) : fallback);
  const start = int(b.bookingStartHour, "travel start hour", 0, 23, true), end = int(b.bookingEndHour, "travel end hour", 0, 24, true);
  if ((start === null) !== (end === null)) throw new CorporateAdminError(400, "Set both travel hours, or neither.");
  const maxTripAmount = money(b.maxTripAmount, "Approval threshold"), blockAboveAmount = money(b.blockAboveAmount, "Maximum trip amount");
  if (maxTripAmount && blockAboveAmount && blockAboveAmount.lt(maxTripAmount)) throw new CorporateAdminError(400, "The maximum trip amount must be at least the approval threshold.");
  const { refs } = await ownOrg(a, { branchId: b.branchId ?? null, departmentId: b.departmentId ?? null });
  if (refs.branchId && refs.departmentId) throw new CorporateAdminError(400, "Apply a policy to a branch or a department, not both.");
  const data = {
    policyName: text(b.policyName, "Policy name", { max: 80 })!,
    description: text(b.description, "Description", { max: 300, optional: true }),
    maxTripAmount, blockAboveAmount,
    allowedCategories: [...new Set(categories as string[])],
    allowedCities: [...new Set((cities as string[]).map((c) => c.trim()))],
    advanceBookingHours: int(b.advanceBookingHours, "minimum advance notice", 0, 720, true),
    nightTravelAllowed: bool(b.nightTravelAllowed, "night travel setting"),
    outstationAllowed: bool(b.outstationAllowed, "outstation setting"),
    airportTravelAllowed: bool(b.airportTravelAllowed, "airport setting"),
    localAllowed: optBool("localAllowed", true), roundTripAllowed: optBool("roundTripAllowed", true), weekendTravelAllowed: optBool("weekendTravelAllowed", true),
    bookingStartHour: start, bookingEndHour: end === 24 ? 0 : end,
    approvalRequired: bool(b.approvalRequired, "approval setting"),
    branchId: refs.branchId ?? null, departmentId: refs.departmentId ?? null,
  };
  const policyId = b.id ? id(b.id, "policy") : null;
  // Without an id the company default is edited (or created), as before.
  const current = policyId
    ? await prisma.corporateTravelPolicy.findFirst({ where: { id: policyId, corporateId: a.corporateId, isActive: true } })
    : b.scoped === true ? null : await corporateTravelPolicyService.getActivePolicy(a.corporateId);
  if (policyId && !current) throw new CorporateAdminError(404, "Policy not found.");
  await prisma.$transaction(async (tx) => {
    if (current) {
      const r = await tx.corporateTravelPolicy.updateMany({ where: { id: current.id, corporateId: a.corporateId, isActive: true }, data });
      if (r.count !== 1) throw new CorporateAdminError(409, "The policy changed. Refresh and retry.");
      await auditEntry(tx, a, "UPDATE", "CorporateTravelPolicy", current.id, Object.fromEntries(POLICY_AUDIT_KEYS.map((k) => [k, current[k as keyof typeof current]])), data);
    } else {
      const created = await tx.corporateTravelPolicy.create({ data: { ...data, corporateId: a.corporateId, isActive: true }, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateTravelPolicy", created.id, undefined, data);
    }
  });
  return policies(a);
}

async function workflowFields(b: Body, a: AdminAccess, creating: boolean) {
  const data: Record<string, unknown> = {};
  if (creating || has(b, "approverType")) {
    const type = b.approverType ?? "CORPORATE_ADMIN";
    if (typeof type !== "string" || !(APPROVER_TYPES as readonly string[]).includes(type)) throw new CorporateAdminError(400, "Choose who approves this step.");
    data.approverType = type;
    data.approverEmployeeId = type === "SPECIFIC_EMPLOYEE" ? await ownEmployee(a, b.approverEmployeeId, "approver") : null;
    if (type === "SPECIFIC_EMPLOYEE" && !data.approverEmployeeId) throw new CorporateAdminError(400, "Choose the approver.");
    data.approverDesignation = text(b.approverDesignation, "Step name", { max: 80, optional: true }) || APPROVER_LABEL[type as keyof typeof APPROVER_LABEL];
  } else if (has(b, "approverDesignation")) data.approverDesignation = text(b.approverDesignation, "Step name", { max: 80 });
  if (creating || has(b, "maxAmount")) data.maxAmount = money(b.maxAmount, "Amount ceiling");
  if (creating || has(b, "minAmount")) data.minAmount = money(b.minAmount, "Minimum amount");
  if (data.minAmount && data.maxAmount && (data.maxAmount as Prisma.Decimal).lt(data.minAmount as Prisma.Decimal)) throw new CorporateAdminError(400, "The amount ceiling must be above the minimum amount.");
  if (creating || has(b, "scope")) {
    const scope = b.scope ?? "COMPANY";
    data.scopeBranchId = null; data.scopeDepartmentId = null; data.scopeEmployeeId = null;
    if (scope === "BRANCH") data.scopeBranchId = (await ownOrg(a, { branchId: b.scopeId })).refs.branchId;
    else if (scope === "DEPARTMENT") data.scopeDepartmentId = (await ownOrg(a, { departmentId: b.scopeId })).refs.departmentId;
    else if (scope === "EMPLOYEE") data.scopeEmployeeId = await ownEmployee(a, b.scopeId, "employee");
    else if (scope !== "COMPANY") throw new CorporateAdminError(400, "Choose who needs this step.");
    if (scope !== "COMPANY" && !data.scopeBranchId && !data.scopeDepartmentId && !data.scopeEmployeeId) throw new CorporateAdminError(400, "Choose the branch, department or employee.");
  }
  return data;
}

async function workflowWrite(b: Body, a: AdminAccess) {
  if (b.action === "CREATE") {
    const data = { level: int(b.level, "level", 1, 10)!, ...(await workflowFields(b, a, true)) };
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateApprovalRule.create({ data: { ...(data as Omit<Prisma.CorporateApprovalRuleUncheckedCreateInput, "corporateId">), corporateId: a.corporateId, isActive: true } as Prisma.CorporateApprovalRuleUncheckedCreateInput, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateApprovalRule", created.id, undefined, data);
      return created;
    });
  }
  const ruleId = id(b.id, "rule");
  const existing = await prisma.corporateApprovalRule.findFirst({ where: { id: ruleId, corporateId: a.corporateId }, select: { id: true, level: true, approverDesignation: true, approverType: true, maxAmount: true, isActive: true } });
  if (!existing) throw new CorporateAdminError(404, "Approval step not found.");
  // Swaps the step with its neighbour; the unique (company, level) pair is kept throughout.
  if (b.action === "MOVE") {
    if (b.direction !== "UP" && b.direction !== "DOWN") throw new CorporateAdminError(400, "Invalid direction.");
    const neighbour = await prisma.corporateApprovalRule.findFirst({ where: { corporateId: a.corporateId, level: b.direction === "UP" ? { lt: existing.level } : { gt: existing.level } }, orderBy: { level: b.direction === "UP" ? "desc" : "asc" }, select: { id: true, level: true } });
    if (!neighbour) return { id: existing.id, level: existing.level };
    return prisma.$transaction(async (tx) => {
      await tx.corporateApprovalRule.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data: { level: 1000 + existing.level } });
      await tx.corporateApprovalRule.updateMany({ where: { id: neighbour.id, corporateId: a.corporateId }, data: { level: existing.level } });
      await tx.corporateApprovalRule.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data: { level: neighbour.level } });
      await auditEntry(tx, a, "UPDATE", "CorporateApprovalRule", existing.id, { level: existing.level }, { level: neighbour.level });
      return { id: existing.id, level: neighbour.level };
    }, { isolationLevel: "Serializable" });
  }
  let data: Record<string, unknown> = {};
  if (b.action === "SET_ACTIVE") data.isActive = bool(b.isActive, "status");
  else if (b.action === "UPDATE") {
    data = await workflowFields(b, a, false);
    if (has(b, "level")) data.level = int(b.level, "level", 1, 10);
  } else throw new CorporateAdminError(400, "Unsupported action.");
  return prisma.$transaction(async (tx) => {
    await tx.corporateApprovalRule.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data });
    await auditEntry(tx, a, "UPDATE", "CorporateApprovalRule", existing.id, existing, data);
    return { id: existing.id };
  });
}

async function budgetScopeOf(b: Body, a: AdminAccess) {
  const scope = b.scope ?? "COMPANY";
  if (scope === "COMPANY") return { branchId: null, departmentId: null, employeeId: null };
  if (scope === "BRANCH") return { branchId: (await ownOrg(a, { branchId: b.scopeId })).refs.branchId ?? null, departmentId: null, employeeId: null, need: true };
  if (scope === "DEPARTMENT") {
    const { refs, department } = await ownOrg(a, { departmentId: b.scopeId });
    return { branchId: null, departmentId: refs.departmentId ?? null, employeeId: null, departmentBranchId: department?.branchId ?? null, need: true };
  }
  if (scope === "EMPLOYEE") {
    const employeeId = await ownEmployee(a, b.scopeId, "employee");
    const e = employeeId ? await prisma.corporateEmployee.findUnique({ where: { id: employeeId }, select: { branchId: true, departmentId: true } }) : null;
    return { branchId: null, departmentId: null, employeeId, employeeBranchId: e?.branchId ?? null, employeeDepartmentId: e?.departmentId ?? null, need: true };
  }
  throw new CorporateAdminError(400, "Choose the budget level.");
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
    const { need, ...scope } = await budgetScopeOf(b, a);
    if (need && !scope.branchId && !scope.departmentId && !scope.employeeId) throw new CorporateAdminError(400, "Choose the branch, department or employee.");
    const conflict = await assertBudgetFits({ corporateId: a.corporateId, allocatedAmount, startDate, endDate, ...scope });
    if (conflict) throw new CorporateAdminError(409, conflict);
    const data = { budgetName: text(b.budgetName, "Budget name", { max: 120 })!, period: period as CorporateBudgetPeriod, allocatedAmount, startDate, endDate, alertThreshold: threshold(b.alertThreshold), branchId: scope.branchId, departmentId: scope.departmentId, employeeId: scope.employeeId };
    return prisma.$transaction(async (tx) => {
      const created = await tx.corporateBudget.create({ data: { ...data, corporateId: a.corporateId }, select: { id: true } });
      await auditEntry(tx, a, "CREATE", "CorporateBudget", created.id, undefined, data);
      return created;
    });
  }
  if (b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  const budgetId = id(b.id, "budget");
  const existing = await prisma.corporateBudget.findFirst({ where: { id: budgetId, corporateId: a.corporateId }, select: { id: true, budgetName: true, allocatedAmount: true, alertThreshold: true, startDate: true, endDate: true, status: true, branchId: true, departmentId: true, employeeId: true, department: { select: { branchId: true } }, employee: { select: { branchId: true, departmentId: true } } } });
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
  if (data.allocatedAmount || data.endDate) {
    const conflict = await assertBudgetFits({
      corporateId: a.corporateId, id: existing.id, allocatedAmount: (data.allocatedAmount as Prisma.Decimal) ?? existing.allocatedAmount,
      startDate: existing.startDate, endDate: (data.endDate as Date) ?? existing.endDate, branchId: existing.branchId, departmentId: existing.departmentId, employeeId: existing.employeeId,
      departmentBranchId: existing.department?.branchId ?? null, employeeBranchId: existing.employee?.branchId ?? null, employeeDepartmentId: existing.employee?.departmentId ?? null,
    });
    if (conflict) throw new CorporateAdminError(409, conflict);
  }
  const { department: _d, employee: _e, ...before } = existing;
  return prisma.$transaction(async (tx) => {
    await tx.corporateBudget.updateMany({ where: { id: existing.id, corporateId: a.corporateId }, data });
    await auditEntry(tx, a, "UPDATE", "CorporateBudget", existing.id, before, data);
    return { id: existing.id };
  });
}

// The same Corporate row Super Admin manages. Status, credit, billing cycle, payment
// terms, the account email and the RideGrid account manager remain RideGrid-managed.
async function companyWrite(b: Body, a: AdminAccess) {
  if (b.action !== "UPDATE") throw new CorporateAdminError(400, "Unsupported action.");
  const data: Record<string, unknown> = {};
  if (has(b, "companyName")) data.companyName = text(b.companyName, "Display name", { max: 160 });
  if (has(b, "legalName")) data.legalName = text(b.legalName, "Legal name", { max: 200, optional: true });
  if (has(b, "mobile")) data.mobile = phone(b.mobile, "Contact mobile");
  if (has(b, "website")) {
    const w = text(b.website, "Website", { max: 200, optional: true });
    if (w && !/^https?:\/\/[^\s]+$/i.test(w)) throw new CorporateAdminError(400, "Website must start with http:// or https://.");
    data.website = w;
  }
  if (has(b, "gstNumber")) {
    data.gstNumber = gstin(b.gstNumber);
    if (data.gstNumber && await prisma.corporate.findFirst({ where: { gstNumber: data.gstNumber as string, id: { not: a.corporateId } }, select: { id: true } }))
      throw new CorporateAdminError(409, "This GSTIN is registered to another RideGrid company. Contact RideGrid support.");
  }
  if (has(b, "panNumber")) {
    const v = text(b.panNumber, "PAN", { max: 10, optional: true });
    if (v && !PAN.test(v.toUpperCase())) throw new CorporateAdminError(400, "Enter a valid 10-character PAN.");
    data.panNumber = v ? v.toUpperCase() : null;
  }
  const spec: [string, string, number, boolean][] = [
    ["address", "Registered address", 300, false], ["city", "City", 80, true], ["state", "State", 80, false],
    ["billingAddress", "Billing address", 300, true], ["billingCity", "Billing city", 80, true], ["billingState", "Billing state", 80, true],
    ["contactPersonName", "Primary contact", 120, true], ["contactPersonDesignation", "Primary contact designation", 80, true],
  ];
  for (const [k, label, max, optional] of spec) if (has(b, k)) data[k] = text(b[k], label, { max, optional });
  if (has(b, "pincode")) data.pincode = pincode(b.pincode);
  if (has(b, "billingPincode")) data.billingPincode = pincode(b.billingPincode, "Billing pincode", true);
  if (has(b, "contactPersonEmail")) data.contactPersonEmail = email(b.contactPersonEmail, "Primary contact email", true);
  if (has(b, "contactPersonMobile")) data.contactPersonMobile = phone(b.contactPersonMobile, "Primary contact mobile", true);
  if (!Object.keys(data).length) throw new CorporateAdminError(400, "Nothing to update.");
  const before = await prisma.corporate.findUnique({ where: { id: a.corporateId }, select: Object.fromEntries(Object.keys(data).map((k) => [k, true])) as Prisma.CorporateSelect });
  return prisma.$transaction(async (tx) => {
    await tx.corporate.update({ where: { id: a.corporateId }, data, select: { id: true } });
    await auditEntry(tx, a, "UPDATE", "Corporate", a.corporateId, before, data);
    return { id: a.corporateId };
  });
}

// Booking actions run through the central booking lifecycle services after the
// booking is confirmed to belong to this company.
async function bookingWrite(b: Body, a: AdminAccess) {
  const bookingId = id(b.id, "booking");
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, corporateId: a.corporateId, deletedAt: null },
    select: { id: true, status: true, pickupDateTime: true, finalFare: true, estimatedFare: true, corporateArchivedAt: true, vehicle: { select: { category: true } }, pricingPackage: { select: { packageType: true, city: true, fromCity: true } }, tripType: true,
      customer: { select: { userId: true, user: { select: { corporateEmployee: { select: { id: true, corporateId: true, travelPolicyId: true, branchId: true, departmentId: true, monthlyTravelLimit: true, yearlyTravelLimit: true } } } } } } },
  });
  if (!booking) throw new CorporateAdminError(404, "Booking not found.");
  if (b.action === "CANCEL") {
    const reason = text(b.reason, "Cancellation reason", { max: 300 })!;
    return cancelBooking(booking.id, a.user.id, `Corporate administrator: ${reason}`);
  }
  if (b.action === "ARCHIVE" || b.action === "RESTORE") {
    const archive = b.action === "ARCHIVE";
    if (archive && !["CANCELLED", "TRIP_COMPLETED"].includes(booking.status)) throw new CorporateAdminError(409, "Only completed or cancelled bookings can be removed from the active view.");
    return prisma.$transaction(async (tx) => {
      await tx.booking.updateMany({ where: { id: booking.id, corporateId: a.corporateId }, data: { corporateArchivedAt: archive ? new Date() : null } });
      await auditEntry(tx, a, "UPDATE", "Booking", booking.id, { corporateArchivedAt: booking.corporateArchivedAt }, { event: archive ? "CORPORATE_ARCHIVED" : "CORPORATE_RESTORED" });
      return { id: booking.id, archived: archive };
    });
  }
  if (b.action !== "EDIT") throw new CorporateAdminError(400, "Unsupported action.");
  const reason = text(b.reason, "Reason for the change", { max: 300 })!;
  const approved = await prisma.corporateApprovalRequest.findFirst({ where: { bookingId: booking.id, corporateId: a.corporateId }, select: { id: true } });
  if (approved) throw new CorporateAdminError(409, "This booking was approved for these exact trip details. Cancel it and submit a new request to change them.");
  const input: { pickupLocation?: string; dropLocation?: string; pickupDateTime?: string; reason: string } = { reason: `Corporate administrator: ${reason}` };
  if (has(b, "pickupLocation")) input.pickupLocation = text(b.pickupLocation, "Pickup address", { max: 300 })!;
  if (has(b, "dropLocation")) input.dropLocation = text(b.dropLocation, "Drop address", { max: 300 })!;
  if (has(b, "pickupDateTime")) {
    const next = new Date(String(b.pickupDateTime));
    if (Number.isNaN(next.getTime())) throw new CorporateAdminError(400, "Invalid pickup time.");
    // A new pickup time must still satisfy the traveller's travel policy without new approval.
    const e = booking.customer.user.corporateEmployee;
    if (e && e.corporateId === a.corporateId && booking.customer.userId) {
      const pkg = booking.pricingPackage?.packageType ?? "";
      const { results } = await corporateTravelPolicyService.evaluateTrip(
        { ...e, userId: booking.customer.userId },
        [{ amount: 0, category: booking.vehicle.category, serviceType: policyServiceType(pkg.startsWith("LOCAL") ? "LOCAL" : pkg.startsWith("AIRPORT") ? "AIRPORT" : "OUTSTATION"), pickupDateTime: next, tripType: booking.tripType, pickupCity: booking.pricingPackage?.fromCity || booking.pricingPackage?.city || null }],
      );
      if (results[0].decision !== "ALLOWED") throw new CorporateAdminError(409, `The new pickup time is outside the travel policy (${results[0].reasons[0] ?? "approval required"}). Cancel and submit a new request instead.`);
    }
    input.pickupDateTime = next.toISOString();
  }
  return updateBooking(booking.id, input, a.user.id);
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
    case "bookings": return bookingWrite(b, a);
    case "support": return createTicket(b, a);
    case "notifications": return notificationWrite(b, a);
    default: throw new CorporateAdminError(404, "Not found.");
  }
}
