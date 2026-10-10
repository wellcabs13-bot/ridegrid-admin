// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { createRatesBatch, deactivateRatesBatch, packageScope } from "@/lib/services/pricing/RateService";
import { scopeKey } from "@/lib/services/pricing/engine";

const admin = { id: "admin", admin: true, finance: false }, vendor = { id: "user", admin: false, finance: false, vendorId: "vendor" };
const from = new Date(Date.now() + 86400_000);
const scope = (destination: string) => ({ vendorId: "vendor", vehicleCategory: "SEDAN", service: "OUTSTATION_ONE_WAY", pricingPackageId: `pkg-${destination}`, city: "pune", origin: "pune", destination, area: "" });
const band = { id: "band", key: "band", version: 1, kind: "BAND", active: true, vendorId: "", service: "", city: "", route: "", vehicleCategory: "", effectiveFrom: new Date("2025-01-01"), effectiveTo: null,
  data: { minimum: "1000", recommended: "3000", maximum: "6000", autoMinimum: "2000", autoMaximum: "4000" } };
let tx: any, calls: string[];
beforeEach(() => {
  calls = [];
  tx = {
    $queryRaw: vi.fn(async () => { calls.push("lock"); return []; }),
    pricingRateVersion: {
      findMany: vi.fn(async () => []),
      createManyAndReturn: vi.fn(async ({ data }) => { calls.push("insert"); return data.map((d: any, i: number) => ({ id: `new-${i}`, ...d })); }),
      updateMany: vi.fn(async () => { calls.push("close"); return { count: 1 }; }),
    },
    pricingPolicy: { findMany: vi.fn(async () => []) },
    auditLog: { createMany: vi.fn(async () => ({ count: 0 })) },
  };
});
const created = () => tx.pricingRateVersion.createManyAndReturn.mock.calls[0][0].data;
const audits = () => tx.auditLog.createMany.mock.calls[0][0].data;

describe("createRatesBatch matches create → submit → approve", () => {
  it("leaves vendor prices outside the auto band pending with version 1 and draft/submit audit", async () => {
    await createRatesBatch(vendor, [{ pricingRuleId: "rule", scope: scope("mumbai"), fare: "3200", terms: { perKm: "0" } }], from, "", tx);
    expect(created()[0]).toMatchObject({ status: "PENDING", version: 1, fare: expect.anything(), scopeKey: scopeKey(scope("mumbai")), createdBy: "user", effectiveFrom: from });
    expect(audits().map((a: any) => [a.action, a.newValue.status])).toEqual([["CREATE", "DRAFT"], ["UPDATE", "PENDING"]]);
  });
  it("auto-approves inside the auto band and Super Admin approves the rest with a reason", async () => {
    tx.pricingPolicy.findMany.mockResolvedValue([band]);
    await createRatesBatch(admin, [{ pricingRuleId: "r", scope: scope("mumbai"), fare: "3000", terms: {} }, { pricingRuleId: "r", scope: scope("nashik"), fare: "5000", terms: {} }], from, "Approved via grid", tx);
    expect(created().map((r: any) => [r.status, r.reviewReason])).toEqual([["APPROVED", "Within auto-approval band"], ["APPROVED", "Approved via grid"]]);
    expect(audits().map((a: any) => a.newValue.status)).toEqual(["DRAFT", "APPROVED", "DRAFT", "PENDING", "APPROVED"]);
  });
  it("auto-approves vendor prices inside the auto band but keeps others pending", async () => {
    tx.pricingPolicy.findMany.mockResolvedValue([band]);
    await createRatesBatch(vendor, [{ pricingRuleId: "r", scope: scope("mumbai"), fare: "3000", terms: {} }, { pricingRuleId: "r", scope: scope("nashik"), fare: "5000", terms: {} }], from, "ignored", tx);
    expect(created().map((r: any) => r.status)).toEqual(["APPROVED", "PENDING"]);
  });
  it("requires a reason for Super Admin approval without a band", async () => {
    await expect(createRatesBatch(admin, [{ pricingRuleId: "r", scope: scope("mumbai"), fare: "3000", terms: {} }], from, "", tx)).rejects.toMatchObject({ code: "APPROVAL_REASON_REQUIRED" });
    expect(tx.pricingRateVersion.createManyAndReturn).not.toHaveBeenCalled();
  });
  it("numbers versions, closes the approved predecessor before inserting, and audits the replacement", async () => {
    const key = scopeKey(scope("mumbai")), old = { id: "old", scopeKey: key, version: 3, status: "APPROVED", effectiveFrom: new Date("2025-01-01"), effectiveTo: null };
    tx.pricingRateVersion.findMany.mockResolvedValue([old, { ...old, id: "older", version: 2, status: "INACTIVE" }]);
    await createRatesBatch(admin, [{ pricingRuleId: "r", scope: scope("mumbai"), fare: "3000", terms: {} }], from, "ok", tx);
    expect(created()[0].version).toBe(4);
    expect(calls).toEqual(["lock", "close", "insert"]);
    expect(tx.pricingRateVersion.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["old"] } }, data: { effectiveTo: from } });
    expect(audits()[0]).toMatchObject({ entityId: "old", newValue: { replacedBy: "new-0" } });
  });
  it("rejects a boundary that does not follow the current approved version, and stale versions", async () => {
    const key = scopeKey(scope("mumbai"));
    tx.pricingRateVersion.findMany.mockResolvedValue([{ id: "old", scopeKey: key, version: 1, status: "APPROVED", effectiveFrom: new Date(from.getTime() + 1000), effectiveTo: null }]);
    await expect(createRatesBatch(admin, [{ pricingRuleId: "r", scope: scope("mumbai"), fare: "3000", terms: {} }], from, "ok", tx)).rejects.toMatchObject({ code: "OVERLAPPING_RATE" });
    await expect(createRatesBatch(admin, [{ pricingRuleId: "r", scope: scope("mumbai"), fare: "3000", terms: {}, expectedVersion: 0 }], from, "ok", tx)).rejects.toMatchObject({ code: "VERSION_CONFLICT" });
  });
  it("refuses another vendor's scope", async () => {
    await expect(createRatesBatch({ ...vendor, vendorId: "other" }, [{ pricingRuleId: "r", scope: scope("mumbai"), fare: "1", terms: {} }], from, "", tx)).rejects.toMatchObject({ status: 403 });
  });
});

describe("deactivateRatesBatch", () => {
  it("locks, deactivates only live versions and audits each", async () => {
    tx.pricingRateVersion.findMany.mockResolvedValueOnce([{ vendorId: "vendor", scopeKey: "k" }]).mockResolvedValueOnce([{ id: "a", status: "APPROVED", scopeKey: "k" }]);
    expect(await deactivateRatesBatch(admin, ["a", "b"], tx)).toBe(1);
    expect(tx.pricingRateVersion.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["a"] } }, data: { status: "INACTIVE", deactivatedAt: expect.any(Date) } });
    expect(audits()[0]).toMatchObject({ entityId: "a", action: "UPDATE", newValue: { status: "INACTIVE" } });
  });
  it("does nothing without ids", async () => {
    expect(await deactivateRatesBatch(admin, [], tx)).toBe(0);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});

it("derives the same scope as createRate for a package", () => {
  expect(packageScope({ vendorId: "v", vehicleCategory: "SEDAN", pricingType: "OUTSTATION" }, { id: "p", packageName: "Pune to Mumbai", city: "Pune", fromCity: null, toCity: null, airportName: null }, "OUTSTATION_ONE_WAY"))
    .toEqual({ vendorId: "v", vehicleCategory: "SEDAN", service: "OUTSTATION_ONE_WAY", pricingPackageId: "p", city: "pune", origin: "pune", destination: "mumbai", area: "" });
});
