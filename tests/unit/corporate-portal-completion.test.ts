// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const model = () => ({ findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() });
const m = vi.hoisted(() => ({ requestUser: vi.fn(), emit: vi.fn(), cancelBooking: vi.fn(), updateBooking: vi.fn(), provision: vi.fn(), storeFile: vi.fn(), pdf: vi.fn() }));
const db = vi.hoisted(() => ({} as Record<string, unknown>));
vi.mock("@/lib/request-access", () => ({ requestUser: m.requestUser }));
vi.mock("@/lib/events/event-dispatcher", () => ({ emitRideGridEvent: m.emit, dispatchRideGridEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/services/admin/BookingAdminService", async (orig) => ({ ...(await orig<object>()), cancelBooking: m.cancelBooking, updateBooking: m.updateBooking }));
vi.mock("@/lib/services/admin/CorporateAdminService", async (orig) => ({ ...(await orig<object>()), provisionEmployeeLogin: m.provision }));
vi.mock("@/lib/services/storage/FileStorageService", () => ({ storeFile: m.storeFile }));
vi.mock("@/lib/services/invoice/InvoicePdfService", () => ({ generateInvoicePdf: m.pdf }));

import { POST } from "@/app/api/corporate-admin/[section]/route";
import { GET as docGet, POST as docPost } from "@/app/api/corporate-admin/documents/[kind]/route";
import { choosePolicy, decideTravelPolicy } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { corporateApprovalService, ruleApplies } from "@/lib/services/corporate/CorporateApprovalService";
import { crc32, zipFiles } from "@/lib/utils/zip";

type Mock = ReturnType<typeof model>;
const p = db as unknown as Record<string, Mock> & { $transaction: ReturnType<typeof vi.fn>; $queryRaw: ReturnType<typeof vi.fn> };
const MODELS = ["corporateEmployee", "corporateBranch", "corporateDepartment", "corporateCostCenter", "corporateTravelPolicy", "corporateApprovalRule", "corporateApprovalRequest", "corporateApprovalStep", "corporateBudget", "corporate", "booking", "invoice", "auditLog", "user", "documentRecord", "fileAsset", "supportTicket", "pricingPackage"];
const base = "https://ridegrid.test/api/corporate-admin/";
const post = (section: string, body: unknown) => POST(new NextRequest(`${base}${section}`, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ section }) });
const membership = { id: "emp-admin-a", isActive: true, corporateId: "corp-a", corporate: { id: "corp-a", companyName: "Acme", status: "ACTIVE", deletedAt: null } };

beforeEach(() => {
  vi.resetAllMocks();
  for (const name of MODELS) db[name] = model();
  p.$transaction = vi.fn((fn: (tx: unknown) => unknown) => fn(db));
  p.$queryRaw = vi.fn().mockResolvedValue([]);
  m.requestUser.mockResolvedValue({ id: "admin-a", name: "Ava", role: "CORPORATE_ADMIN" });
  p.corporateEmployee.findFirst.mockImplementation(async (a: { where: { userId?: string } }) => (a.where.userId === "admin-a" ? membership : null));
  p.auditLog.create.mockResolvedValue({ id: "audit" });
});

describe("travel policy engine: new controls stay backward compatible", () => {
  const future = new Date(Date.now() + 5 * 86400000);
  const trip = { amount: "4000", category: "SEDAN", serviceType: "OUTSTATION" as const, pickupDateTime: future };
  const none = { monthlyTravelLimit: null, yearlyTravelLimit: null }, zero = { monthUsed: 0, yearUsed: 0 };
  const legacy = { id: "p", policyName: "Old", maxTripAmount: null, allowedCategories: [], advanceBookingHours: null, nightTravelAllowed: true, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: false };
  it("a policy without the new fields behaves exactly as before", () => {
    expect(decideTravelPolicy(legacy, trip, none, zero).decision).toBe("ALLOWED");
    expect(decideTravelPolicy(legacy, { ...trip, serviceType: "LOCAL" }, none, zero).decision).toBe("ALLOWED");
  });
  it("blocks disallowed service types and trips above the hard cap", () => {
    expect(decideTravelPolicy({ ...legacy, localAllowed: false }, { ...trip, serviceType: "LOCAL" }, none, zero).decision).toBe("NOT_ALLOWED");
    expect(decideTravelPolicy({ ...legacy, roundTripAllowed: false }, { ...trip, tripType: "ROUNDTRIP" }, none, zero).decision).toBe("NOT_ALLOWED");
    expect(decideTravelPolicy({ ...legacy, blockAboveAmount: new Prisma.Decimal(3000) }, trip, none, zero).decision).toBe("NOT_ALLOWED");
  });
  it("sends weekend, out-of-hours and other-city trips to approval", () => {
    const sat = new Date("2099-01-03T06:30:00.000Z"); // Saturday 12:00 IST
    expect(decideTravelPolicy({ ...legacy, weekendTravelAllowed: false }, { ...trip, pickupDateTime: sat }, none, zero).decision).toBe("APPROVAL_REQUIRED");
    const early = new Date("2099-01-05T01:30:00.000Z"); // Monday 07:00 IST
    expect(decideTravelPolicy({ ...legacy, bookingStartHour: 9, bookingEndHour: 19 }, { ...trip, pickupDateTime: early }, none, zero).reasons).toContain("Pickup time is outside the travel hours allowed by corporate policy.");
    expect(decideTravelPolicy({ ...legacy, allowedCities: ["Pune"] }, { ...trip, pickupCity: "Mumbai" }, none, zero).decision).toBe("APPROVAL_REQUIRED");
    expect(decideTravelPolicy({ ...legacy, allowedCities: ["Pune"] }, { ...trip, pickupCity: "pune" }, none, zero).decision).toBe("ALLOWED");
  });
  it("routes a trip that exceeds any covering budget to approval", () => {
    const r = decideTravelPolicy(legacy, trip, none, zero, new Date(), [{ name: 'department "Sales"', remaining: "3500" }]);
    expect(r.decision).toBe("APPROVAL_REQUIRED");
    expect(r.reasons).toContain('This trip exceeds the remaining department "Sales" budget.');
    expect(decideTravelPolicy(legacy, trip, none, zero, new Date(), [{ name: "company", remaining: "4000" }]).decision).toBe("ALLOWED");
  });
  it("applies the most specific policy: employee, department, branch, company", () => {
    const policies = [{ id: "co" }, { id: "br", branchId: "b1" }, { id: "de", departmentId: "d1" }, { id: "own" }];
    expect(choosePolicy(policies, { travelPolicyId: "own", departmentId: "d1", branchId: "b1" })!.id).toBe("own");
    expect(choosePolicy(policies, { departmentId: "d1", branchId: "b1" })!.id).toBe("de");
    expect(choosePolicy(policies, { branchId: "b1" })!.id).toBe("br");
    expect(choosePolicy(policies, { branchId: "b9" })!.id).toBe("co");
  });
});

describe("approval workflow routing", () => {
  it("scopes steps by branch, department, employee and amount band", () => {
    const subject = { id: "e1", branchId: "b1", departmentId: "d1" };
    expect(ruleApplies({ maxAmount: null, scopeDepartmentId: "d1" }, 100, subject)).toBe(true);
    expect(ruleApplies({ maxAmount: null, scopeDepartmentId: "d2" }, 100, subject)).toBe(false);
    expect(ruleApplies({ maxAmount: null, scopeBranchId: "b2" }, 100, subject)).toBe(false);
    expect(ruleApplies({ maxAmount: null, minAmount: new Prisma.Decimal(5000) }, 4000, subject)).toBe(false);
    expect(ruleApplies({ maxAmount: new Prisma.Decimal(3000) }, 4000, subject)).toBe(false);
  });
  it("resolves real approvers and falls back to corporate administrators, never the requester", async () => {
    const person = (id: string, over = {}) => ({ id, employeeName: `N-${id}`, userId: `u-${id}`, isActive: true, corporateId: "corp-a", ...over });
    p.corporateEmployee.findFirst.mockResolvedValue({ id: "e1", reportingManager: person("m1"), approvalManager: null, department: { head: person("e1"), approver: person("x", { isActive: false }) } });
    p.corporateEmployee.findMany.mockResolvedValue([person("fin")]);
    const r = await corporateApprovalService.resolveApprovers("corp-a", "e1", [{ approverType: "REPORTING_MANAGER" }, { approverType: "DEPARTMENT_HEAD" }, { approverType: "DEPARTMENT_APPROVER" }, { approverType: "SPECIFIC_EMPLOYEE", approverEmployeeId: "fin" }, { approverType: "CORPORATE_ADMIN" }]);
    expect(r[0]).toMatchObject({ approverType: "REPORTING_MANAGER", assignedEmployeeId: "m1", assignedUserId: "u-m1" });
    expect(r[1]).toMatchObject({ approverType: "CORPORATE_ADMIN", assignedEmployeeId: null }); // the head is the requester
    expect(r[2]).toMatchObject({ approverType: "CORPORATE_ADMIN", assignedEmployeeId: null }); // inactive approver
    expect(r[3]).toMatchObject({ approverType: "SPECIFIC_EMPLOYEE", assignedEmployeeId: "fin" });
    expect(p.corporateEmployee.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["fin"] }, corporateId: "corp-a" });
  });
  it("lets an employee approver decide only their own assigned step", async () => {
    const request = { id: "r", corporateId: "corp-a", employeeId: "e1", status: "PENDING", currentStage: "MANAGER", requestSnapshot: null, employee: { userId: "u-e1" }, steps: [{ id: "s1", level: 1, stage: "MANAGER", status: "PENDING", assignedEmployeeId: "m1" }] };
    p.corporateApprovalRequest.findFirst.mockResolvedValue(request);
    await expect(corporateApprovalService.decide({ requestId: "r", corporateId: "corp-a", actorUserId: "u-x", actorEmployeeId: "x", action: "APPROVE" })).rejects.toMatchObject({ status: 403 });
    await expect(corporateApprovalService.decide({ requestId: "r", corporateId: "corp-a", actorUserId: "u-e1", actorEmployeeId: "e1", action: "APPROVE" })).rejects.toMatchObject({ status: 403 });
    expect(p.corporateApprovalStep.updateMany).not.toHaveBeenCalled();
    p.corporateApprovalStep.updateMany.mockResolvedValue({ count: 1 }); p.corporateApprovalRequest.updateMany.mockResolvedValue({ count: 1 });
    await expect(corporateApprovalService.decide({ requestId: "r", corporateId: "corp-a", actorUserId: "u-m1", actorEmployeeId: "m1", action: "APPROVE" })).resolves.toMatchObject({ status: "APPROVED" });
  });
});

describe("Corporate Admin A cannot touch Corporate B through the new actions", () => {
  it("activates/deactivates only its own branches and departments", async () => {
    p.corporateBranch.updateMany.mockResolvedValue({ count: 0 });
    expect((await post("branches", { action: "SET_ACTIVE", id: "br-b", isActive: false })).status).toBe(404);
    expect(p.corporateBranch.updateMany.mock.calls[0][0].where).toEqual({ id: "br-b", corporateId: "corp-a" });
    p.corporateDepartment.updateMany.mockResolvedValue({ count: 0 });
    expect((await post("departments", { action: "SET_ACTIVE", id: "d-b", isActive: false })).status).toBe(404);
    expect(p.corporateDepartment.updateMany.mock.calls[0][0].where).toEqual({ id: "d-b", corporateId: "corp-a" });
  });
  it("rejects a Corporate B person as department head, manager or workflow approver", async () => {
    expect((await post("departments", { action: "CREATE", departmentName: "Sales", headEmployeeId: "emp-b" })).status).toBe(403);
    expect((await post("workflow", { action: "CREATE", level: 1, approverType: "SPECIFIC_EMPLOYEE", approverEmployeeId: "emp-b" })).status).toBe(403);
    expect((await post("employees", { action: "CREATE", employeeName: "N", employeeCode: "N1", officialEmail: "n@a.test", mobile: "9000000000", designation: "A", reportingManagerId: "emp-b" })).status).toBe(403);
    expect(p.corporateDepartment.create).not.toHaveBeenCalled();
    expect(p.corporateApprovalRule.create).not.toHaveBeenCalled();
    expect(p.corporateEmployee.create).not.toHaveBeenCalled();
  });
  it("rejects a Corporate B branch as a budget or policy scope", async () => {
    expect((await post("budgets", { action: "CREATE", budgetName: "B", period: "MONTHLY", allocatedAmount: 1000, startDate: "2099-01-01", endDate: "2099-01-31", scope: "BRANCH", scopeId: "br-b" })).status).toBe(403);
    expect((await post("policy", { action: "SAVE", scoped: true, policyName: "P", allowedCategories: [], branchId: "br-b", nightTravelAllowed: true, outstationAllowed: true, airportTravelAllowed: true, approvalRequired: false })).status).toBe(403);
    expect(p.corporateBudget.create).not.toHaveBeenCalled();
    expect(p.corporateTravelPolicy.create).not.toHaveBeenCalled();
  });
  it("cannot cancel, edit or archive a Corporate B booking", async () => {
    p.booking.findFirst.mockResolvedValue(null);
    for (const action of ["CANCEL", "EDIT", "ARCHIVE"]) expect((await post("bookings", { action, id: "bk-b", reason: "x" })).status).toBe(404);
    expect(p.booking.findFirst.mock.calls[0][0].where).toEqual({ id: "bk-b", corporateId: "corp-a", deletedAt: null });
    expect(m.cancelBooking).not.toHaveBeenCalled();
    expect(m.updateBooking).not.toHaveBeenCalled();
  });
  it("cannot open another company's document or bundle another company's invoices", async () => {
    p.documentRecord.findFirst.mockResolvedValue(null);
    const doc = (kind: string, q: string) => docGet(new NextRequest(`${base}documents/${kind}${q}`), { params: Promise.resolve({ kind }) });
    expect((await doc("file", "?id=doc-b")).status).toBe(404);
    expect(p.documentRecord.findFirst.mock.calls[0][0].where).toEqual({ id: "doc-b", category: { not: null }, OR: [{ entityType: "CORPORATE", entityId: "corp-a" }, { entityType: "RIDEGRID", entityId: "WELLCABS" }] });
    p.invoice.findMany.mockResolvedValue([]);
    expect((await doc("invoices", "?ids=inv-b")).status).toBe(404);
    expect(p.invoice.findMany.mock.calls[0][0].where).toEqual({ id: { in: ["inv-b"] }, booking: { corporateId: "corp-a", deletedAt: null } });
    expect((await doc("invoices", `?ids=${Array.from({ length: 51 }, (_, i) => `i${i}`).join(",")}`)).status).toBe(400);
    expect(m.pdf).not.toHaveBeenCalled();
  });
  it("cannot raise a support ticket against another company's booking", async () => {
    p.booking.findFirst.mockResolvedValue(null);
    expect((await post("support", { category: "BOOKING", subject: "Late", description: "Driver late", bookingId: "bk-b" })).status).toBe(404);
    expect(p.supportTicket.create).not.toHaveBeenCalled();
  });
});

describe("corporate booking actions reuse the central lifecycle", () => {
  const booking = (over = {}) => ({ id: "bk", status: "CONFIRMED", pickupDateTime: new Date(Date.now() + 86400000), finalFare: null, estimatedFare: new Prisma.Decimal(1000), corporateArchivedAt: null, vehicle: { category: "SEDAN" }, pricingPackage: null, tripType: "ONEWAY", customer: { userId: "u", user: { corporateEmployee: null } }, ...over });
  it("cancels through the central cancellation with the admin as actor", async () => {
    p.booking.findFirst.mockResolvedValue(booking());
    m.cancelBooking.mockResolvedValue({ id: "bk", refundState: "CORPORATE_CREDIT_RESTORED" });
    expect((await post("bookings", { action: "CANCEL", id: "bk", reason: "Trip postponed" })).status).toBe(200);
    expect(m.cancelBooking).toHaveBeenCalledWith("bk", "admin-a", "Corporate administrator: Trip postponed");
  });
  it("archives only completed or cancelled bookings, without deleting them", async () => {
    p.booking.findFirst.mockResolvedValue(booking());
    expect((await post("bookings", { action: "ARCHIVE", id: "bk" })).status).toBe(409);
    p.booking.findFirst.mockResolvedValue(booking({ status: "TRIP_COMPLETED" }));
    p.booking.updateMany.mockResolvedValue({ count: 1 });
    expect((await post("bookings", { action: "ARCHIVE", id: "bk" })).status).toBe(200);
    expect(p.booking.updateMany.mock.calls[0][0]).toMatchObject({ where: { id: "bk", corporateId: "corp-a" }, data: { corporateArchivedAt: expect.any(Date) } });
    expect(p.booking.update).not.toHaveBeenCalled();
  });
  it("refuses to edit a booking that was approved for its exact details", async () => {
    p.booking.findFirst.mockResolvedValue(booking());
    p.corporateApprovalRequest.findFirst.mockResolvedValue({ id: "req" });
    expect((await post("bookings", { action: "EDIT", id: "bk", reason: "r", pickupLocation: "New" })).status).toBe(409);
    expect(m.updateBooking).not.toHaveBeenCalled();
  });
});

describe("company, employees and budgets", () => {
  it("validates GSTIN and keeps it unique across companies", async () => {
    expect((await post("company", { action: "UPDATE", gstNumber: "BAD" })).status).toBe(400);
    p.corporate.findFirst.mockResolvedValue({ id: "corp-b" });
    expect((await post("company", { action: "UPDATE", gstNumber: "27AAACR5055K1Z5" })).status).toBe(409);
    expect(p.corporate.update).not.toHaveBeenCalled();
  });
  it("updates only its own company record and never status or credit", async () => {
    p.corporate.findUnique.mockResolvedValue({});
    p.corporate.update.mockResolvedValue({ id: "corp-a" });
    expect((await post("company", { action: "UPDATE", legalName: "Acme Pvt Ltd", status: "ACTIVE", creditLimit: 999999 })).status).toBe(200);
    expect(p.corporate.update.mock.calls[0][0]).toEqual({ where: { id: "corp-a" }, data: { legalName: "Acme Pvt Ltd" }, select: { id: true } });
  });
  it("does not create a second identity for an email another account already uses", async () => {
    p.user.findFirst = vi.fn().mockResolvedValue({ email: "n@a.test" });
    expect((await post("employees", { action: "CREATE", employeeName: "N", employeeCode: "N1", officialEmail: "n@a.test", mobile: "9000000000", designation: "A" })).status).toBe(409);
    expect(p.corporateEmployee.create).not.toHaveBeenCalled();
  });
  it("provisions an app login through the central provisioning for its own employee", async () => {
    p.corporateEmployee.findFirst.mockImplementation(async (a: { where: { userId?: string; id?: string } }) => (a.where.userId === "admin-a" ? membership : a.where.id === "emp-1" ? { id: "emp-1", isActive: true, userId: null, user: null } : null));
    m.provision.mockResolvedValue({ email: "e@a.test", temporaryPassword: "Temp#1234567" });
    expect((await post("employees", { action: "PROVISION_LOGIN", id: "emp-1" })).status).toBe(200);
    expect(m.provision).toHaveBeenCalledWith("corp-a", "emp-1", "admin-a");
  });
  it("refuses a child budget larger than its parent for the same period", async () => {
    p.corporateBranch.findFirst.mockResolvedValue({ id: "br-a", isActive: true });
    p.corporateBudget.findFirst.mockResolvedValue({ allocatedAmount: new Prisma.Decimal(10000), budgetName: "Company FY" });
    p.corporateBudget.aggregate.mockResolvedValue({ _sum: { allocatedAmount: new Prisma.Decimal(8000) } });
    const r = await post("budgets", { action: "CREATE", budgetName: "Pune", period: "MONTHLY", allocatedAmount: 3000, startDate: "2099-01-01", endDate: "2099-01-31", scope: "BRANCH", scopeId: "br-a" });
    expect(r.status).toBe(409);
    expect((await r.json()).message).toContain("company budget");
    expect(p.corporateBudget.create).not.toHaveBeenCalled();
  });
});

describe("document uploads", () => {
  const upload = (file: File, fields: Record<string, string>) => {
    const form = new FormData(); form.append("file", file); for (const [k, v] of Object.entries(fields)) form.append(k, v);
    return docPost(new NextRequest(`${base}documents/upload`, { method: "POST", body: form }), { params: Promise.resolve({ kind: "upload" }) });
  };
  it("rejects files whose content does not match the declared type", async () => {
    const fake = new File([new TextEncoder().encode("<html>not a pdf</html>")], "gst.pdf", { type: "application/pdf" });
    expect((await upload(fake, { section: "CLIENT", kind: "GST_CERTIFICATE" })).status).toBe(400);
    expect(m.storeFile).not.toHaveBeenCalled();
  });
  it("never lets a company publish RideGrid documents", async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "reg.pdf", { type: "application/pdf" });
    expect((await upload(pdf, { section: "RIDEGRID", kind: "GST_CERTIFICATE" })).status).toBe(403);
    expect((await upload(pdf, { section: "CLIENT", kind: "GST_CERTIFICATE", corporateId: "corp-b" })).status).toBe(403);
    expect(m.storeFile).not.toHaveBeenCalled();
  });
  it("stores a valid document against the session's company", async () => {
    m.storeFile.mockResolvedValue({ name: "gst.pdf", fileUrl: "/api/files/f1", storageKey: "media/f1/gst.pdf" });
    p.fileAsset.create.mockResolvedValue({ id: "fa" });
    p.documentRecord.create.mockResolvedValue({ id: "dr" });
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "gst.pdf", { type: "application/pdf" });
    expect((await upload(pdf, { section: "CLIENT", kind: "GST_CERTIFICATE" })).status).toBe(200);
    expect(p.documentRecord.create.mock.calls[0][0].data).toMatchObject({ entityType: "CORPORATE", entityId: "corp-a", category: "CLIENT.GST_CERTIFICATE", documentType: "GST", status: "PENDING" });
  });
});

describe("bulk invoice ZIP", () => {
  it("writes a valid stored ZIP", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
    const zip = zipFiles([{ name: "a.pdf", data: new Uint8Array([1, 2, 3]) }, { name: "a.pdf", data: new Uint8Array([4]) }]);
    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
    expect(zip.readUInt16LE(zip.length - 12)).toBe(2);
    expect(zip.toString("latin1")).toContain("a-2.pdf");
  });
});
