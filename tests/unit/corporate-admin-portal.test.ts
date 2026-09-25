// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const model = () => ({ findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), createMany: vi.fn() });
const m = vi.hoisted(() => ({ requestUser: vi.fn(), generateInvoicePdf: vi.fn() }));
const db = vi.hoisted(() => ({} as Record<string, unknown>));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/services/invoice/InvoicePdfService", () => ({ generateInvoicePdf: m.generateInvoicePdf }));

import { GET, POST } from "@/app/api/corporate-admin/[section]/route";
import { GET as docGet } from "@/app/api/corporate-admin/documents/[kind]/route";
import { GET as invoicePdf } from "@/app/api/invoices/pdf/route";
import { protectDocumentFile } from "@/lib/vendor-mobile/file-access";

type Mock = ReturnType<typeof model>;
const p = db as unknown as Record<string, Mock> & { $transaction: ReturnType<typeof vi.fn>; $queryRaw: ReturnType<typeof vi.fn> };
const MODELS = ["corporateEmployee", "corporateApprovalRequest", "corporateApprovalStep", "corporateApprovalRule", "corporateTravelPolicy", "corporateBudget", "corporateBranch", "corporateDepartment", "corporateCostCenter", "corporate", "corporateWallet", "corporateWalletTransaction", "corporateInvoiceSetting", "booking", "invoice", "transaction", "notification", "user", "auditLog", "customer", "vendor", "vehicleDocument", "driverDocument", "vendorDocument", "documentRecord", "tripLocation"];

const base = "https://ridegrid.test/api/corporate-admin/";
const ctx = (section: string) => ({ params: Promise.resolve({ section }) });
const get = (section: string, query = "") => GET(new NextRequest(`${base}${section}${query}`), ctx(section));
const post = (section: string, body: unknown, headers: Record<string, string> = {}) =>
  POST(new NextRequest(`${base}${section}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers } }), ctx(section));

const ADMIN = { id: "admin-a", name: "Ava Admin", role: "CORPORATE_ADMIN" };
const membership = (over: Record<string, unknown> = {}) => ({ id: "emp-admin-a", isActive: true, corporateId: "corp-a", corporate: { id: "corp-a", companyName: "Acme", status: "ACTIVE", deletedAt: null }, ...over });

beforeEach(() => {
  vi.resetAllMocks();
  for (const name of MODELS) db[name] = model();
  p.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(db));
  p.$queryRaw = vi.fn().mockResolvedValue([]);
  m.requestUser.mockResolvedValue(ADMIN);
  p.corporateEmployee.findFirst.mockImplementation(async (args: { where: { userId?: string } }) => (args.where.userId === "admin-a" ? membership() : null));
  p.auditLog.create.mockResolvedValue({ id: "audit" });
});

describe("authentication and role gate", () => {
  it("rejects unauthenticated requests before touching company data", async () => {
    m.requestUser.mockResolvedValue(null);
    expect((await get("dashboard")).status).toBe(401);
    expect((await post("approvals", { id: "req", action: "APPROVE" })).status).toBe(401);
    expect(p.corporateEmployee.findFirst).not.toHaveBeenCalled();
  });
  it("rejects corporate employees and every other non-admin role", async () => {
    for (const role of ["CORPORATE_EMPLOYEE", "CUSTOMER", "VENDOR", "DRIVER", "OPERATIONS", "SUPER_ADMIN"]) {
      m.requestUser.mockResolvedValue({ id: "u", name: "x", role });
      expect((await get("employees")).status).toBe(403);
      expect((await post("policy", { action: "SAVE" })).status).toBe(403);
    }
    expect(p.corporateEmployee.findFirst).not.toHaveBeenCalled();
  });
  it("rejects inactive memberships and read-only-suspended companies for writes", async () => {
    p.corporateEmployee.findFirst.mockResolvedValue(membership({ isActive: false }));
    expect((await get("dashboard")).status).toBe(403);
    p.corporateEmployee.findFirst.mockResolvedValue(membership({ corporate: { id: "corp-a", companyName: "Acme", status: "SUSPENDED", deletedAt: null } }));
    expect((await post("branches", { action: "CREATE" })).status).toBe(403);
    p.corporate.findUnique.mockResolvedValue({ accountManagerName: null });
    expect((await get("support")).status).toBe(200);
  });
  it("rejects cross-site mutations", async () => {
    expect((await post("approvals", { id: "req", action: "APPROVE" }, { origin: "https://evil.test" })).status).toBe(403);
    expect(p.corporateApprovalRequest.findFirst).not.toHaveBeenCalled();
  });
  it("derives company identity from the session membership", async () => {
    await get("support");
    expect(p.corporateEmployee.findFirst.mock.calls[0][0].where).toEqual({ userId: "admin-a" });
  });
});

describe("Corporate Admin A cannot reach Corporate B", () => {
  it("refuses a foreign company identifier in the query or the body", async () => {
    expect((await get("employees", "?corporateId=corp-b")).status).toBe(403);
    expect((await get("bookings", "?companyId=corp-b")).status).toBe(403);
    expect((await post("policy", { action: "SAVE", corporateId: "corp-b" })).status).toBe(403);
    expect((await post("budgets", { action: "CREATE", corporateId: "corp-b" })).status).toBe(403);
    expect(p.corporateTravelPolicy.updateMany).not.toHaveBeenCalled();
  });
  it("reads employees only within its own company", async () => {
    p.corporateEmployee.findMany.mockResolvedValue([]); p.corporateEmployee.count.mockResolvedValue(0);
    await get("employees");
    expect(p.corporateEmployee.findMany.mock.calls[0][0].where).toMatchObject({ corporateId: "corp-a" });
    expect((await get("employees", "?id=emp-b")).status).toBe(404);
    expect(p.corporateEmployee.findFirst.mock.calls.at(-1)![0].where).toEqual({ id: "emp-b", corporateId: "corp-a" });
    const select = p.corporateEmployee.findFirst.mock.calls.at(-1)![0].select;
    expect(JSON.stringify(select)).not.toContain("password");
  });
  it("cannot edit a Corporate B employee", async () => {
    expect((await post("employees", { action: "UPDATE", id: "emp-b", employeeName: "X" })).status).toBe(404);
    expect((await post("employees", { action: "SET_ACTIVE", id: "emp-b", isActive: false })).status).toBe(404);
    expect(p.corporateEmployee.updateMany).not.toHaveBeenCalled();
  });
  it("cannot attach a Corporate B department or branch to an employee", async () => {
    p.corporateDepartment.findFirst.mockResolvedValue(null);
    const r = await post("employees", { action: "CREATE", employeeName: "N", employeeCode: "N1", officialEmail: "n@a.test", mobile: "9000000000", designation: "Analyst", departmentId: "dept-b" });
    expect(r.status).toBe(403);
    expect(p.corporateDepartment.findFirst.mock.calls[0][0].where).toEqual({ id: "dept-b", corporateId: "corp-a" });
    expect(p.corporateEmployee.create).not.toHaveBeenCalled();
  });
  it("reads bookings only from its own company's central booking rows", async () => {
    p.booking.findFirst.mockResolvedValue(null);
    expect((await get("bookings", "?id=booking-b")).status).toBe(404);
    expect(p.booking.findFirst.mock.calls[0][0].where).toEqual({ corporateId: "corp-a", deletedAt: null, id: "booking-b" });
    p.booking.findMany.mockResolvedValue([]); p.booking.count.mockResolvedValue(0); p.vendor.findMany.mockResolvedValue([]);
    await get("bookings");
    expect(JSON.stringify(p.booking.findMany.mock.calls[0][0].where)).toContain('"corporateId":"corp-a"');
  });
  it("rejects a Corporate B employee used as a booking filter", async () => {
    expect((await get("bookings", "?employeeId=emp-b")).status).toBe(404);
    expect(p.booking.findMany).not.toHaveBeenCalled();
  });
  it("cannot read or decide a Corporate B approval request", async () => {
    p.corporateApprovalRequest.findFirst.mockResolvedValue(null);
    expect((await get("approvals", "?id=req-b")).status).toBe(404);
    expect(p.corporateApprovalRequest.findFirst.mock.calls[0][0].where).toEqual({ id: "req-b", corporateId: "corp-a" });
    expect((await post("approvals", { id: "req-b", action: "APPROVE" })).status).toBe(404);
    expect(p.corporateApprovalRequest.findFirst.mock.calls[1][0].where).toEqual({ id: "req-b", corporateId: "corp-a" });
    expect(p.corporateApprovalStep.updateMany).not.toHaveBeenCalled();
    expect(p.notification.create).not.toHaveBeenCalled();
  });
  it("edits only its own travel policy", async () => {
    p.corporateTravelPolicy.findFirst.mockResolvedValue({ id: "pol-a", policyName: "Old", maxTripAmount: null, allowedCategories: [], advanceBookingHours: null, nightTravelAllowed: true, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: false, updatedAt: new Date() });
    p.corporateTravelPolicy.updateMany.mockResolvedValue({ count: 1 });
    p.corporateApprovalRule.findMany.mockResolvedValue([]);
    const r = await post("policy", { action: "SAVE", policyName: "Standard", maxTripAmount: "5000", allowedCategories: ["SEDAN"], advanceBookingHours: 4, nightTravelAllowed: false, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: false });
    expect(r.status).toBe(200);
    expect(p.corporateTravelPolicy.findFirst.mock.calls[0][0].where).toEqual({ corporateId: "corp-a", isActive: true });
    expect(p.corporateTravelPolicy.updateMany.mock.calls[0][0].where).toEqual({ id: "pol-a", corporateId: "corp-a", isActive: true });
    expect(p.auditLog.create.mock.calls[0][0].data).toMatchObject({ userId: "admin-a", action: "UPDATE", entityName: "CorporateTravelPolicy", entityId: "pol-a" });
  });
  it("rejects invalid policy categories", async () => {
    expect((await post("policy", { action: "SAVE", policyName: "P", allowedCategories: ["JET"], nightTravelAllowed: true, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: false })).status).toBe(400);
  });
  it("cannot edit Corporate B budgets or workflow", async () => {
    p.corporateBudget.findFirst.mockResolvedValue(null);
    expect((await post("budgets", { action: "UPDATE", id: "budget-b", allocatedAmount: 1 })).status).toBe(404);
    expect(p.corporateBudget.findFirst.mock.calls[0][0].where).toEqual({ id: "budget-b", corporateId: "corp-a" });
    p.corporateApprovalRule.findFirst.mockResolvedValue(null);
    expect((await post("workflow", { action: "SET_ACTIVE", id: "rule-b", isActive: false })).status).toBe(404);
    expect(p.corporateBudget.updateMany).not.toHaveBeenCalled();
    expect(p.corporateApprovalRule.updateMany).not.toHaveBeenCalled();
  });
  it("reads only its own credit account", async () => {
    p.corporate.findFirst.mockResolvedValue({ id: "corp-a", companyName: "Acme", status: "ACTIVE", creditLimit: new Prisma.Decimal(100000) });
    p.corporateWallet.findUnique.mockResolvedValue({ id: "w", balance: new Prisma.Decimal(2500), creditLimit: null, updatedAt: new Date() });
    p.corporate.findUnique.mockResolvedValue({ billingCycle: "MONTHLY", paymentTermsDays: 30, status: "ACTIVE" });
    p.corporateInvoiceSetting.findUnique.mockResolvedValue(null);
    p.corporateWalletTransaction.findMany.mockResolvedValue([]);
    p.transaction.groupBy.mockResolvedValue([]);
    const r = await get("billing");
    const body = await r.json();
    expect(body.data.credit).toMatchObject({ creditLimit: 100000, outstanding: 2500, available: 97500 });
    expect(p.corporate.findFirst.mock.calls[0][0].where).toEqual({ id: "corp-a", deletedAt: null });
    expect(p.corporateWalletTransaction.findMany.mock.calls[0][0].where).toEqual({ wallet: { corporateId: "corp-a" } });
    expect(JSON.stringify(body)).not.toMatch(/vendorPayout|VendorWallet|rideGridRevenue/);
  });
  it("cannot open Corporate B documents or invoices", async () => {
    const doc = (kind: string, q = "") => docGet(new NextRequest(`${base}documents/${kind}${q}`), { params: Promise.resolve({ kind }) });
    p.invoice.findFirst.mockResolvedValue(null);
    expect((await doc("invoice", "?id=inv-b")).status).toBe(404);
    expect(p.invoice.findFirst.mock.calls[0][0].where).toEqual({ id: "inv-b", booking: { corporateId: "corp-a", deletedAt: null } });
    expect(m.generateInvoicePdf).not.toHaveBeenCalled();
    expect((await doc("quotation")).status).toBe(404);
    expect(p.$queryRaw.mock.calls[0].slice(1)).toEqual(["corp-a"]);
    expect((await doc("../etc")).status).toBe(404);
  });
});

describe("privilege escalation", () => {
  it("ignores role fields and never modifies user accounts", async () => {
    p.corporateEmployee.findFirst.mockImplementation(async (args: { where: { userId?: string; id?: string } }) =>
      args.where.userId === "admin-a" ? membership() : args.where.id === "emp-a2" ? { id: "emp-a2", isActive: true, isApprover: false, branchId: null, departmentId: null, user: { role: "CORPORATE_EMPLOYEE" } } : null);
    p.corporateEmployee.updateMany.mockResolvedValue({ count: 1 });
    const r = await post("employees", { action: "UPDATE", id: "emp-a2", designation: "Lead", role: "SUPER_ADMIN", userId: "admin-a" });
    expect(r.status).toBe(200);
    expect(p.corporateEmployee.updateMany.mock.calls[0][0].data).toEqual({ designation: "Lead" });
    expect(p.user.update).not.toHaveBeenCalled();
    expect(p.user.updateMany).not.toHaveBeenCalled();
  });
  it("cannot deactivate itself or another company administrator", async () => {
    p.corporateEmployee.findFirst.mockImplementation(async (args: { where: { userId?: string; id?: string } }) =>
      args.where.userId === "admin-a" ? membership() : args.where.id === "emp-admin-a" ? { id: "emp-admin-a", isActive: true, user: { role: "CORPORATE_ADMIN" } } : args.where.id === "emp-admin-2" ? { id: "emp-admin-2", isActive: true, user: { role: "CORPORATE_ADMIN" } } : null);
    expect((await post("employees", { action: "SET_ACTIVE", id: "emp-admin-a", isActive: false })).status).toBe(409);
    expect((await post("employees", { action: "SET_ACTIVE", id: "emp-admin-2", isActive: false })).status).toBe(403);
    expect(p.corporateEmployee.updateMany).not.toHaveBeenCalled();
  });
  it("has no endpoint that assigns roles", async () => {
    expect((await post("admins", { userId: "u", role: "SUPER_ADMIN" })).status).toBe(404);
    expect((await post("users", { role: "SUPER_ADMIN" })).status).toBe(404);
  });
});

describe("approval decisions reuse the employee app's request", () => {
  const request = () => ({
    id: "req-a", corporateId: "corp-a", status: "PENDING", currentStage: "FINAL", employee: { userId: "emp-user" },
    requestSnapshot: { pickupDateTime: new Date(Date.now() + 86400000).toISOString() },
    steps: [{ id: "step-1", level: 1, stage: "FINAL", status: "PENDING" }],
  });
  it("approves the same record, notifies the employee and audits", async () => {
    p.corporateApprovalRequest.findFirst.mockResolvedValue(request());
    p.corporateApprovalStep.updateMany.mockResolvedValue({ count: 1 });
    p.corporateApprovalRequest.updateMany.mockResolvedValue({ count: 1 });
    const r = await post("approvals", { id: "req-a", action: "APPROVE", remarks: "ok" });
    expect(r.status).toBe(200);
    expect((await r.json()).data).toMatchObject({ id: "req-a", status: "APPROVED" });
    expect(p.corporateApprovalStep.updateMany.mock.calls[0][0].data).toMatchObject({ status: "APPROVED", approverId: "admin-a" });
    expect(p.notification.create.mock.calls[0][0].data).toMatchObject({ userId: "emp-user", title: "Ride request approved" });
    expect(p.booking.create).not.toHaveBeenCalled();
    expect(p.auditLog.create.mock.calls[0][0].data).toMatchObject({ entityName: "CorporateApprovalRequest", entityId: "req-a", userId: "admin-a" });
  });
  it("requires a reason to reject and refuses decided requests", async () => {
    expect((await post("approvals", { id: "req-a", action: "REJECT" })).status).toBe(400);
    p.corporateApprovalRequest.findFirst.mockResolvedValue({ ...request(), status: "APPROVED" });
    expect((await post("approvals", { id: "req-a", action: "REJECT", remarks: "no" })).status).toBe(409);
  });
});

describe("shared document and invoice routes", () => {
  const pdf = (id: string) => invoicePdf(new NextRequest(`https://ridegrid.test/api/invoices/pdf?id=${id}`));
  it("no longer serves any invoice to any signed-in user", async () => {
    m.requestUser.mockResolvedValue(null);
    expect((await pdf("inv-b")).status).toBe(401);
    m.requestUser.mockResolvedValue(ADMIN);
    p.invoice.findFirst.mockResolvedValue(null);
    expect((await pdf("inv-b")).status).toBe(404);
    expect(p.invoice.findFirst.mock.calls[0][0].where.booking).toEqual({ corporateId: { not: null }, corporate: { employees: { some: { userId: "admin-a", isActive: true } } } });
    m.requestUser.mockResolvedValue({ id: "cust", name: "C", role: "CUSTOMER" });
    await pdf("inv-b");
    expect(p.invoice.findFirst.mock.calls[1][0].where.booking).toEqual({ customer: { userId: "cust" } });
    m.requestUser.mockResolvedValue({ id: "drv", name: "D", role: "DRIVER" });
    expect((await pdf("inv-b")).status).toBe(404);
    expect(p.invoice.findFirst).toHaveBeenCalledTimes(2);
    expect(m.generateInvoicePdf).not.toHaveBeenCalled();
  });
  it("protects corporate quotation files from other companies", async () => {
    for (const k of ["vehicleDocument", "driverDocument", "vendorDocument", "documentRecord"]) p[k].findFirst.mockResolvedValue(null);
    p.$queryRaw.mockResolvedValue([{ corporateId: "corp-a" }]);
    const req = new NextRequest("https://ridegrid.test/api/files/file-1");
    m.requestUser.mockResolvedValue(null);
    await expect(protectDocumentFile(req, "file-1")).rejects.toMatchObject({ status: 401 });
    m.requestUser.mockResolvedValue({ id: "admin-b", name: "B", role: "CORPORATE_ADMIN" });
    p.corporateEmployee.findFirst.mockResolvedValue(null);
    await expect(protectDocumentFile(req, "file-1")).rejects.toMatchObject({ status: 403 });
    expect(p.corporateEmployee.findFirst.mock.calls.at(-1)![0].where).toEqual({ userId: "admin-b", corporateId: "corp-a", isActive: true });
    m.requestUser.mockResolvedValue({ id: "e", name: "E", role: "CORPORATE_EMPLOYEE" });
    await expect(protectDocumentFile(req, "file-1")).rejects.toMatchObject({ status: 403 });
    m.requestUser.mockResolvedValue(ADMIN);
    p.corporateEmployee.findFirst.mockResolvedValue({ id: "emp-admin-a" });
    await expect(protectDocumentFile(req, "file-1")).resolves.toBe(true);
  });
});
