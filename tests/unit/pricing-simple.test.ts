// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: { $transaction: vi.fn(), $queryRaw: vi.fn(), vendor: { findMany: vi.fn() }, vehicle: { findMany: vi.fn(), findFirst: vi.fn() }, pricingPackage: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() }, pricingRateVersion: { findMany: vi.fn() }, pricingPolicy: { findMany: vi.fn() }, pricingRule: { upsert: vi.fn() } },
  createRate: vi.fn(), transitionRate: vi.fn(), savePolicy: vi.fn(), evidence: vi.fn(), lock: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/services/pricing/RateService", () => ({ createRate: mocks.createRate, transitionRate: mocks.transitionRate, savePolicy: mocks.savePolicy, evidence: mocks.evidence, lock: mocks.lock }));
import { activeVendorWhere, pairWhere, saveSimplePolicy, saveSimpleRates, serviceInput, simplePricingData } from "@/lib/services/pricing/SimplePricingService";
import { calculateBreakdown, Terms } from "@/lib/services/pricing/engine";

const admin = { id: "admin", admin: true, finance: false }, vendor = { id: "user", admin: false, finance: false, vendorId: "vendor" };
const pair = (id: string) => ({ id, vendorId: "vendor", driverId: `driver-${id}`, category: "SEDAN", make: "Car", model: "Model", registrationNumber: id, driver: { id: `driver-${id}`, firstName: "Assigned", lastName: "Driver" } });
const input = { vendorId: "vendor", service: "ONE_WAY", city: "Pune", destination: "Mumbai", fare: "2000", pairs: [{ vehicleId: "car1", driverId: "driver-car1" }], expectedVersions: {}, effectiveFrom: "2035-01-01T00:00:00Z" };
const policy = (kind: string, data: unknown) => ({ id: kind, key: kind, kind, version: 2, name: kind, data, active: true, effectiveFrom: new Date("2025-01-01"), effectiveTo: null });
beforeEach(() => {
  vi.resetAllMocks(); mocks.db.$transaction.mockImplementation(fn => fn(mocks.db));
  mocks.db.vendor.findMany.mockResolvedValue([{ id: "vendor", companyName: "Eligible vendor" }]);
  mocks.db.vehicle.findMany.mockImplementation(async args => args.select.homeCity ? [{ homeCity: "Nashik" }] : [pair("car1")]);
  mocks.db.vehicle.findFirst.mockImplementation(async ({ where }) => where.id === "foreign" ? null : pair(where.id));
  mocks.db.pricingPackage.findMany.mockResolvedValue([{ city: "Pune", fromCity: "Pune", toCity: "Mumbai", packageName: "Pune to Mumbai" }]);
  mocks.db.pricingPackage.findFirst.mockResolvedValue(null);
  mocks.db.pricingPackage.create.mockImplementation(async ({ data }) => ({ id: `${data.vehicleId}-${data.packageName}`, ...data }));
  mocks.db.pricingRule.upsert.mockImplementation(async ({ create }) => ({ id: "rule", isActive: true, ...create }));
  mocks.db.pricingPolicy.findMany.mockResolvedValue([]); mocks.db.pricingRateVersion.findMany.mockResolvedValue([]);
  mocks.createRate.mockImplementation(async (_actor, data) => ({ id: data.pricingPackageId, version: 1, ...data }));
  mocks.transitionRate.mockResolvedValue({ status: "PENDING" }); mocks.savePolicy.mockImplementation(async (_actor, data) => data);
});

describe("simple pricing eligibility and bulk writes", () => {
  it("loads only active approved vendors with active accounts", async () => {
    await simplePricingData(admin, "SUPER_ADMIN");
    expect(mocks.db.vendor.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: activeVendorWhere }));
    expect(activeVendorWhere).toMatchObject({ isApproved: true, deletedAt: null, user: { isActive: true, deletedAt: null } });
  });
  it("scopes vendor choices and pairs to the authenticated vendor", async () => {
    await simplePricingData(vendor, "VENDOR");
    expect(mocks.db.vendor.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ...activeVendorWhere, id: "vendor" } }));
    expect(mocks.db.vehicle.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: pairWhere("vendor") }));
    expect(pairWhere("vendor")).toMatchObject({ vendorId: "vendor", status: "AVAILABLE", deletedAt: null, driver: { is: { status: "ACTIVE", deletedAt: null } } });
  });
  it("rejects foreign or inactive/misaligned pairs before creating rates", async () => {
    await expect(saveSimpleRates(vendor, { ...input, pairs: [{ vehicleId: "foreign", driverId: "driver" }] })).rejects.toThrow("no longer active");
    expect(mocks.createRate).not.toHaveBeenCalled();
  });
  it("rejects another vendor and finance rate writes", async () => {
    await expect(saveSimpleRates(vendor, { ...input, vendorId: "other" })).rejects.toMatchObject({ status: 403 });
    await expect(saveSimpleRates({ ...vendor, finance: true }, input)).rejects.toMatchObject({ status: 403 });
  });
  it("creates and submits one separate version for each selected aligned pair", async () => {
    const result = await saveSimpleRates(vendor, { ...input, pairs: [...input.pairs, { vehicleId: "car2", driverId: "driver-car2" }] });
    expect(result).toMatchObject({ vehicleCount: 2, rateCount: 2, pending: 2 });
    expect(mocks.createRate).toHaveBeenCalledTimes(2); expect(mocks.transitionRate).toHaveBeenCalledTimes(2);
    expect(mocks.createRate.mock.calls[0][3]).toMatchObject({ driverAllowance: "0", waitingPerHour: "250", operational: { vehicleId: "car1", driverId: "driver-car1", extraPickupDrop: "250", waitingFreeMinutes: "30" } });
    expect(mocks.createRate.mock.calls[0][2]).toBe(mocks.db);
  });
  it("fans roundtrip pricing out to each pair and visit city without rewriting old rates", async () => {
    const result = await saveSimpleRates(admin, { ...input, service: "ROUNDTRIP", destinations: ["Mumbai", "Nashik"], kmPerDay: "300", perKm: "14", driverAllowance: "500", pairs: [...input.pairs, { vehicleId: "car2", driverId: "driver-car2" }] });
    expect(result.rateCount).toBe(4);
    expect(mocks.createRate.mock.calls.map(call => call[1].fare)).toEqual(["4700.00", "4700.00", "4700.00", "4700.00"]);
    expect(new Set(mocks.createRate.mock.calls.map(call => call[1].pricingPackageId)).size).toBe(4);
  });
  it("passes the loaded version boundary through to the existing concurrency guard", async () => {
    await saveSimpleRates(admin, input);
    expect(mocks.createRate.mock.calls[0][1].expectedVersion).toBe(0);
    mocks.createRate.mockRejectedValue(new Error("The rate changed. Reload before saving."));
    await expect(saveSimpleRates(admin, input)).rejects.toThrow("Reload");
  });
});

describe("service-specific terms and Decimal calculations", () => {
  const cities = ["Pune", "Mumbai", "Nashik"];
  function calculate(raw: Record<string, unknown>, metrics = {}) {
    const parsed = serviceInput(raw, cities);
    const terms = { ...parsed.terms, cancellationReference: "existing policy", operational: { service: parsed.service, waitingFreeMinutes: parsed.service === "ONE_WAY" ? "30" : "0" } } as Terms;
    return calculateBreakdown({ fare: parsed.fare, terms, fee: { fixed: "0", percent: "10", minimum: "0", processingFixed: "0", processingPercent: "0", waive: false }, taxes: [{ name: "test GST", rate: "5", jurisdiction: "IN", components: ["VENDOR_FARE", "PLATFORM_FEE"], deductVendorDiscount: false, deductPlatformDiscount: false }], discounts: [], charges: [], ...metrics });
  }
  it("rejects identical and unknown one-way endpoints", () => {
    expect(() => serviceInput({ ...input, destination: "pUnE" }, cities)).toThrow("different");
    expect(() => serviceInput({ ...input, destination: "Unknown" }, cities)).toThrow("different");
  });
  it.each([["8_80", "80", "8"], ["12_120", "120", "12"]])("keeps local %s package limits and both overage rates", (packageName, includedKm, includedHours) => {
    const raw = { ...input, service: "LOCAL", package: packageName, fare: "2000", extraKm: "12", extraHour: "150" };
    expect(serviceInput(raw, cities).terms).toMatchObject({ includedKm, includedHours, perKm: "12", perHour: "150", driverAllowance: "0" });
    const result = calculate(raw, { distanceKm: String(Number(includedKm) + 10), durationHours: String(Number(includedHours) + 2) });
    expect(result).toMatchObject({ distanceCharge: "120.00", timeCharge: "300.00", vendorFare: "2420.00", platformFee: "242.00", taxAmount: "133.10", finalPayable: "2795.10" });
  });
  it("calculates roundtrip day base then trip days without double-counting driver allowance", () => {
    const raw = { ...input, service: "ROUNDTRIP", destinations: ["Mumbai"], kmPerDay: "300", perKm: "14", driverAllowance: "500" };
    expect(serviceInput(raw, cities).fare).toBe("4700.00");
    expect(calculate(raw, { days: "3", distanceKm: "950" })).toMatchObject({ vendorFare: "14800.00", distanceCharge: "700.00" });
    expect(() => calculate(raw, { days: "0" })).toThrow("positive whole");
  });
  it("excludes pickup from roundtrip destinations and rejects nonpositive daily KM", () => {
    expect(() => serviceInput({ ...input, service: "ROUNDTRIP", destinations: ["Pune"], kmPerDay: "300", perKm: "14", driverAllowance: "500" }, cities)).toThrow("different");
    expect(() => serviceInput({ ...input, service: "ROUNDTRIP", destinations: ["Mumbai"], kmPerDay: "0", perKm: "14", driverAllowance: "500" }, cities)).toThrow("positive whole");
  });
  it("includes the first 30 minutes of waiting for one-way", () => {
    expect(calculate(input, { waitingHours: "0.5" }).vendorFare).toBe("2000.00");
    expect(calculate(input, { waitingHours: "1.5" }).vendorFare).toBe("2250.00");
  });
});

describe("central GST and platform fee controls", () => {
  it("returns the existing versioned policies rather than seeded percentages", async () => {
    const policies = [policy("TAX", [{ rate: "5" }]), policy("FEE", { percent: "8" })];
    mocks.db.pricingPolicy.findMany.mockResolvedValue(policies);
    expect((await simplePricingData(admin, "SUPER_ADMIN")).policies).toEqual(policies);
  });
  it("saves both percentages through the versioned policy service in one transaction", async () => {
    await saveSimplePolicy(admin, { gst: "5", fee: "8", taxBase: "BOTH", expectedVersions: {}, effectiveFrom: "2035-01-01" });
    expect(mocks.savePolicy).toHaveBeenCalledTimes(2);
    expect(mocks.savePolicy.mock.calls[0][1]).toMatchObject({ kind: "TAX", vendorId: "", data: [{ rate: "5", components: ["VENDOR_FARE", "PLATFORM_FEE"] }] });
    expect(mocks.savePolicy.mock.calls[1][1]).toMatchObject({ kind: "FEE", data: { percent: "8" }, expectedVersion: 0 });
    expect(mocks.savePolicy.mock.calls[1][2]).toBe(mocks.db);
  });
  it("preserves configured tax bases and additional fee rules", async () => {
    mocks.db.pricingPolicy.findMany.mockResolvedValue([policy("TAX", [{ name: "GST", rate: "5", jurisdiction: "IN", components: ["VENDOR_FARE"], deductVendorDiscount: true, deductPlatformDiscount: false }]), policy("FEE", { fixed: "25", percent: "8", minimum: "50", processingFixed: "2", processingPercent: "1", waive: false })]);
    await saveSimplePolicy(admin, { gst: "6", fee: "9", expectedVersions: { TAX: 2, FEE: 2 }, effectiveFrom: "2035-01-01" });
    expect(mocks.savePolicy.mock.calls[0][1].data[0]).toMatchObject({ rate: "6", components: ["VENDOR_FARE"], deductVendorDiscount: true });
    expect(mocks.savePolicy.mock.calls[1][1].data).toMatchObject({ percent: "9", fixed: "25", minimum: "50", processingPercent: "1" });
  });
  it("requires explicit initial tax base and rejects vendor fee changes", async () => {
    await expect(saveSimplePolicy(admin, { gst: "5", fee: "8", expectedVersions: {}, effectiveFrom: "2035-01-01" })).rejects.toThrow("GST applies");
    await expect(saveSimplePolicy(vendor, {})).rejects.toMatchObject({ status: 403 });
  });
});
