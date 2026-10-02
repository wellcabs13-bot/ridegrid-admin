// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  db: { $transaction: vi.fn(), $queryRaw: vi.fn(), vendor: { findMany: vi.fn() }, vehicle: { findMany: vi.fn(), findFirst: vi.fn() }, pricingPackage: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() }, pricingRateVersion: { findMany: vi.fn(), findFirst: vi.fn() }, pricingPolicy: { findMany: vi.fn() }, pricingRule: { upsert: vi.fn(), findUnique: vi.fn() } },
  createRate: vi.fn(), transitionRate: vi.fn(), savePolicy: vi.fn(), evidence: vi.fn(), lock: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/services/pricing/RateService", () => ({ createRate: mocks.createRate, transitionRate: mocks.transitionRate, savePolicy: mocks.savePolicy, evidence: mocks.evidence, lock: mocks.lock }));
import { activeVendorWhere, bulkInput, pairWhere, saveBulkRates, saveSimplePolicy, saveSimpleRates, serviceInput, simplePricingData } from "@/lib/services/pricing/SimplePricingService";
import { pricingCatalog } from "@/lib/services/pricing/catalog";
import { calculateBreakdown, Terms } from "@/lib/services/pricing/engine";

const admin = { id: "admin", admin: true, finance: false }, vendor = { id: "user", admin: false, finance: false, vendorId: "vendor" };
const pair = (id: string) => ({ id, vendorId: "vendor", driverId: `driver-${id}`, category: "SEDAN", make: "Car", model: "Model", registrationNumber: id, driver: { id: `driver-${id}`, firstName: "Assigned", lastName: "Driver" } });
const input = { vendorId: "vendor", service: "LOCAL", city: "Pune", package: "8_80", fare: "2000", extraKm: "12", extraHour: "150", pairs: [{ vehicleId: "car1", driverId: "driver-car1" }], expectedVersions: {}, effectiveFrom: "2035-01-01T00:00:00Z" };
const policy = (kind: string, data: unknown) => ({ id: kind, key: kind, kind, version: 2, name: kind, data, active: true, effectiveFrom: new Date("2025-01-01"), effectiveTo: null });
beforeEach(() => {
  vi.resetAllMocks(); mocks.db.$transaction.mockImplementation(fn => fn(mocks.db));
  mocks.db.vendor.findMany.mockResolvedValue([{ id: "vendor", companyName: "Eligible vendor" }]);
  mocks.db.vehicle.findMany.mockResolvedValue([pair("car1")]);
  mocks.db.vehicle.findFirst.mockImplementation(async ({ where }) => where.id === "foreign" ? null : pair(where.id));
  mocks.db.pricingPackage.findFirst.mockResolvedValue(null);
  mocks.db.pricingPackage.create.mockImplementation(async ({ data }) => ({ id: `${data.vehicleId}-${data.packageName}`, ...data }));
  mocks.db.pricingRule.upsert.mockImplementation(async ({ create }) => ({ id: "rule", isActive: true, ...create }));
  mocks.db.pricingPolicy.findMany.mockResolvedValue([]); mocks.db.pricingRateVersion.findMany.mockResolvedValue([]); mocks.db.pricingRateVersion.findFirst.mockResolvedValue(null);
  mocks.createRate.mockImplementation(async (_actor, data) => ({ id: data.pricingPackageId, version: 1, ...data }));
  mocks.transitionRate.mockResolvedValue({ status: "PENDING" }); mocks.savePolicy.mockImplementation(async (_actor, data) => data);
});

describe("simple pricing eligibility and local writes", () => {
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
  it("returns catalog cities and the latest live price per package for grid prefill", async () => {
    mocks.db.pricingRateVersion.findMany.mockImplementation(async args => args.select ? [
      { pricingPackageId: "p1", version: 3, status: "PENDING", service: "OUTSTATION_ONE_WAY", fare: "3300", terms: { includedKm: "0", perKm: "0", operational: { driverAllowancePerDay: "0" } }, pricingPackage: { vehicleId: "car1", packageName: "Pune to Mumbai", city: "Pune", toCity: "Mumbai" } },
      { pricingPackageId: "p1", version: 2, status: "APPROVED", service: "OUTSTATION_ONE_WAY", fare: "3000", terms: {}, pricingPackage: { vehicleId: "car1", packageName: "Pune to Mumbai", city: "Pune", toCity: "Mumbai" } },
    ] : []);
    const data = await simplePricingData(vendor, "VENDOR");
    expect(data.cities).toContain("Pune");
    expect(data.prices).toEqual([expect.objectContaining({ vehicleId: "car1", destination: "Mumbai", fare: "3300.00", status: "PENDING" })]);
  });
  it("rejects foreign or inactive/misaligned pairs before creating rates", async () => {
    await expect(saveSimpleRates(vendor, { ...input, pairs: [{ vehicleId: "foreign", driverId: "driver" }] })).rejects.toThrow("no longer active");
    expect(mocks.createRate).not.toHaveBeenCalled();
  });
  it("rejects another vendor and finance rate writes", async () => {
    await expect(saveSimpleRates(vendor, { ...input, vendorId: "other" })).rejects.toMatchObject({ status: 403 });
    await expect(saveSimpleRates({ ...vendor, finance: true }, input)).rejects.toMatchObject({ status: 403 });
  });
  it("creates and submits one separate local version for each selected aligned pair", async () => {
    const result = await saveSimpleRates(vendor, { ...input, pairs: [...input.pairs, { vehicleId: "car2", driverId: "driver-car2" }] });
    expect(result).toMatchObject({ vehicleCount: 2, rateCount: 2, pending: 2 });
    expect(mocks.createRate).toHaveBeenCalledTimes(2); expect(mocks.transitionRate).toHaveBeenCalledTimes(2);
    expect(mocks.createRate.mock.calls[0][3]).toMatchObject({ includedKm: "80", includedHours: "8", perKm: "12", perHour: "150", operational: { service: "LOCAL", vehicleId: "car1", driverId: "driver-car1" } });
    expect(mocks.createRate.mock.calls[0][2]).toBe(mocks.db);
  });
  it("accepts only catalog operating cities for local, case-insensitively", async () => {
    await saveSimpleRates(admin, { ...input, city: "pUNE" });
    expect(mocks.db.pricingPackage.create.mock.calls[0][0].data).toMatchObject({ city: "Pune", packageName: "8 Hrs / 80 Kms", packageType: "LOCAL_HOURLY" });
    await expect(saveSimpleRates(admin, { ...input, city: "Lucknow" })).rejects.toThrow("operating cities");
  });
  it("passes the loaded version boundary through to the existing concurrency guard", async () => {
    await saveSimpleRates(admin, input);
    expect(mocks.createRate.mock.calls[0][1].expectedVersion).toBe(0);
    mocks.createRate.mockRejectedValue(new Error("The rate changed. Reload before saving."));
    await expect(saveSimpleRates(admin, input)).rejects.toThrow("Reload");
  });
});

describe("service-specific terms and Decimal calculations", () => {
  const catalog = pricingCatalog();
  const terms = (parsed: { terms: Partial<Terms>; driverAllowance: string }, service: string) => ({ ...parsed.terms, cancellationReference: "existing policy", operational: { service, waitingFreeMinutes: service === "ONE_WAY" ? "30" : "0", driverAllowancePerDay: parsed.driverAllowance } }) as Terms;
  const fee = { fixed: "0", percent: "10", minimum: "0", processingFixed: "0", processingPercent: "0", waive: false };
  const taxes = [{ name: "test GST", rate: "5", jurisdiction: "IN", components: ["VENDOR_FARE", "PLATFORM_FEE"] as ("VENDOR_FARE" | "PLATFORM_FEE")[], deductVendorDiscount: false, deductPlatformDiscount: false }];
  it.each([["8_80", "80", "8"], ["12_120", "120", "12"]])("keeps local %s package limits and both overage rates", (packageName, includedKm, includedHours) => {
    const parsed = serviceInput({ ...input, package: packageName }, catalog.cities);
    expect(parsed.terms).toMatchObject({ includedKm, includedHours, perKm: "12", perHour: "150", driverAllowance: "0" });
    const result = calculateBreakdown({ fare: parsed.fare, terms: terms(parsed, "LOCAL"), fee, taxes, discounts: [], charges: [], distanceKm: String(Number(includedKm) + 10), durationHours: String(Number(includedHours) + 2) });
    expect(result).toMatchObject({ distanceCharge: "120.00", timeCharge: "300.00", vendorFare: "2420.00", platformFee: "242.00", taxAmount: "133.10", finalPayable: "2795.10" });
  });
  it("rejects zero local prices", () => {
    expect(() => serviceInput({ ...input, fare: "0" }, catalog.cities)).toThrow("more than");
  });
  it("includes the first 30 minutes of waiting for one-way", () => {
    const spec = bulkInput({ service: "ONE_WAY", city: "Pune", rows: [{ destination: "Mumbai", fare: "2000" }] }, catalog).rows[0].spec!;
    const calc = (waitingHours: string) => calculateBreakdown({ fare: spec.fare, terms: terms(spec, "ONE_WAY"), fee, taxes, discounts: [], charges: [], waitingHours }).vendorFare;
    expect(calc("0.5")).toBe("2000.00");
    expect(calc("1.5")).toBe("2250.00");
  });
});

describe("website route catalog bulk grids", () => {
  const catalog = pricingCatalog();
  const oneWay = (rows: unknown[], city = "Pune") => bulkInput({ service: "ONE_WAY", city, rows }, catalog);
  it("uses the published website route and tour pages as the pricing source", () => {
    expect(catalog.cities).toEqual(expect.arrayContaining(["Pune", "Mumbai", "Nashik", "Chhatrapati Sambhajinagar (Aurangabad)"]));
    expect(catalog.routes.Pune).toEqual(expect.arrayContaining(["Mumbai", "Nashik", "Shirdi", "Kolhapur", "Chhatrapati Sambhajinagar"]));
    expect(catalog.routes.Pune).not.toContain("Pune");
    expect(catalog.tours.Pune.map(t => t.name)).toEqual(expect.arrayContaining(["Ashtavinayak Darshan", "Mumbai Darshan", "Shirdi + Shani Shingnapur", "Ganagapur + Akkalkot", "Bhandardara + Igatpuri"]));
    expect(catalog.tours.Pune).toHaveLength(20);
  });
  it("accepts Pune to Mumbai without requiring an existing marketplace price", () => {
    expect(oneWay([{ destination: "Mumbai", fare: "3200" }]).rows[0]).toMatchObject({ destination: "Mumbai", name: "Pune to Mumbai", spec: { fare: "3200.00", terms: { waitingPerHour: "250" } } });
  });
  it("normalizes case and city aliases", () => {
    expect(oneWay([{ destination: "MUMBAI", fare: "1" }], "pune").city).toBe("Pune");
    expect(oneWay([{ destination: "Aurangabad", fare: "1" }]).rows[0].destination).toBe("Chhatrapati Sambhajinagar");
    expect(oneWay([{ destination: "Pune", fare: "1" }], "Aurangabad").city).toBe("Chhatrapati Sambhajinagar (Aurangabad)");
  });
  it("rejects same, unpublished and duplicate destinations", () => {
    expect(() => oneWay([{ destination: "pune", fare: "1" }])).toThrow("different");
    expect(() => oneWay([{ destination: "Lucknow", fare: "1" }])).toThrow("not a published");
    expect(() => oneWay([{ destination: "Mumbai", fare: "1" }, { destination: "mumbai", fare: "2" }])).toThrow("more than once");
    expect(() => oneWay([{ destination: "Mumbai", fare: "1" }], "Lucknow")).toThrow("operating cities");
  });
  it("treats blank prices as not offered and rejects zero or invalid money", () => {
    expect(oneWay([{ destination: "Mumbai", fare: "" }, { destination: "Nashik", fare: " " }]).rows.map(r => r.spec)).toEqual([null, null]);
    expect(() => oneWay([{ destination: "Mumbai", fare: "0" }])).toThrow("more than");
    expect(() => oneWay([{ destination: "Mumbai", fare: "-5" }])).toThrow("non-negative");
    expect(oneWay([{ destination: "Mumbai", fare: "2999.999" }]).rows[0].spec!.fare).toBe("3000.00");
  });
  it("calculates roundtrip Base KM x Per KM + Driver Allowance and drops incomplete rows", () => {
    const parsed = bulkInput({ service: "ROUNDTRIP", city: "Pune", rows: [{ destination: "Mumbai", baseKm: "300", perKm: "14", driverAllowance: "500" }, { destination: "Nashik", baseKm: "300", perKm: "", driverAllowance: "500" }, { destination: "Shirdi", baseKm: "", perKm: "", driverAllowance: "" }] }, catalog);
    expect(parsed.rows.map(r => r.spec?.fare ?? null)).toEqual(["4700.00", null, null]);
    expect(parsed.rows[0].spec).toMatchObject({ driverAllowance: "500.00", terms: { includedKm: "300", minimumKmPerDay: "300", perKm: "14", driverAllowance: "0" } });
    const result = calculateBreakdown({ fare: parsed.rows[0].spec!.fare, terms: { ...parsed.rows[0].spec!.terms, cancellationReference: "", operational: { service: "ROUNDTRIP" } } as Terms, fee: { fixed: "0", percent: "0", minimum: "0", processingFixed: "0", processingPercent: "0", waive: false }, taxes: [], discounts: [], charges: [], days: "3", distanceKm: "950" });
    expect(result).toMatchObject({ vendorFare: "14800.00", distanceCharge: "700.00" });
    expect(() => bulkInput({ service: "ROUNDTRIP", city: "Pune", rows: [{ destination: "Mumbai", baseKm: "0", perKm: "14", driverAllowance: "0" }] }, catalog)).toThrow("positive whole");
  });
  it("prices only published tours of the starting city and keeps notes", () => {
    const parsed = bulkInput({ service: "TOUR", city: "Pune", rows: [{ tour: "pune-to-ashtavinayak-darshan-tour", fare: "9000", notes: "  2 days, 8 temples " }, { tour: "pune-to-mumbai-darshan-tour", fare: "" }] }, catalog);
    expect(parsed.rows[0]).toMatchObject({ name: "Pune to Ashtavinayak Darshan", destination: "Ashtavinayak Darshan", spec: { service: "TOUR", fare: "9000.00", notes: "2 days, 8 temples" } });
    expect(parsed.rows[1].spec).toBeNull();
    expect(() => bulkInput({ service: "TOUR", city: "Mumbai", rows: [{ tour: "pune-to-ashtavinayak-darshan-tour", fare: "1" }] }, catalog)).toThrow("not published");
  });
});

describe("bulk grid writes", () => {
  const bulk = { vendorId: "vendor", service: "ONE_WAY", city: "Pune", effectiveFrom: "2035-01-01T00:00:00Z", pairs: [{ vehicleId: "car1", driverId: "driver-car1" }, { vehicleId: "car2", driverId: "driver-car2" }],
    rows: [{ destination: "Mumbai", fare: "3200" }, { destination: "Nashik", fare: "3500" }, { destination: "Shirdi", fare: "5200" }, { destination: "Kolhapur", fare: "" }] };
  it("applies every priced route to every selected car in one transaction", async () => {
    const result = await saveBulkRates(admin, bulk);
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.createRate).toHaveBeenCalledTimes(6);
    expect(new Set(mocks.createRate.mock.calls.map(call => call[1].pricingPackageId)).size).toBe(6);
    expect(mocks.db.pricingPackage.create.mock.calls.map(call => call[0].data.packageName)).toEqual(expect.arrayContaining(["Pune to Mumbai", "Pune to Nashik", "Pune to Shirdi"]));
    expect(result).toMatchObject({ vehicleCount: 2, rateCount: 6, routesPriced: 3, routesBlank: 1, cleared: 0 });
  });
  it("deactivates an existing price when its row is cleared", async () => {
    mocks.db.pricingRule.findUnique.mockResolvedValue({ id: "rule" });
    mocks.db.pricingPackage.findFirst.mockImplementation(async ({ where }) => where.packageName.equals === "Pune to Kolhapur" ? { id: `${where.vehicleId}-kolhapur`, isActive: true } : null);
    mocks.db.pricingRateVersion.findMany.mockResolvedValue([{ id: "old", version: 2 }]);
    const result = await saveBulkRates(admin, bulk);
    expect(mocks.transitionRate).toHaveBeenCalledWith(admin, "old", "deactivate", expect.any(String), 2, mocks.db);
    expect(result.cleared).toBe(2);
  });
  it("skips unchanged prices instead of duplicating versions", async () => {
    mocks.db.pricingPackage.findFirst.mockResolvedValue({ id: "pkg", isActive: true, packageType: "OUTSTATION_ONE_WAY", city: "Pune", fromCity: "Pune", toCity: "Mumbai" });
    mocks.db.pricingRateVersion.findFirst.mockImplementation(async ({ where }) => where.pricingPackageId ? { fare: "3200.00", terms: { includedKm: "0", includedHours: "0", perKm: "0", perHour: "0", waitingPerHour: "250", operational: { driverId: "driver-car1", driverAllowancePerDay: "0" } } } : null);
    const result = await saveBulkRates(admin, { ...bulk, pairs: [bulk.pairs[0]], rows: [{ destination: "Mumbai", fare: "3200" }] });
    expect(mocks.createRate).not.toHaveBeenCalled();
    expect(result).toMatchObject({ unchanged: 1, rateCount: 0 });
  });
  it("stores tour notes on the versioned rate terms", async () => {
    await saveBulkRates(admin, { ...bulk, pairs: [bulk.pairs[0]], service: "TOUR", rows: [{ tour: "pune-to-ashtavinayak-darshan-tour", fare: "9000", notes: "Includes temple waiting" }] });
    expect(mocks.db.pricingRule.upsert.mock.calls[0][0].create).toMatchObject({ pricingType: "OUTSTATION", tripType: "ROUNDTRIP" });
    expect(mocks.db.pricingPackage.create.mock.calls[0][0].data).toMatchObject({ packageType: "TOUR_PACKAGE", packageName: "Pune to Ashtavinayak Darshan", fromCity: "Pune", toCity: "Ashtavinayak Darshan" });
    expect(mocks.createRate.mock.calls[0][3].operational).toMatchObject({ service: "TOUR", notes: "Includes temple waiting" });
  });
  it("does not require a future start when only clearing", async () => {
    await expect(saveBulkRates(admin, { ...bulk, effectiveFrom: "2020-01-01T00:00:00Z", rows: [{ destination: "Kolhapur", fare: "" }] })).resolves.toMatchObject({ rateCount: 0 });
    await expect(saveBulkRates(admin, { ...bulk, effectiveFrom: "2020-01-01T00:00:00Z" })).rejects.toThrow("future");
  });
  it("rejects writes for another vendor", async () => {
    await expect(saveBulkRates(vendor, { ...bulk, vendorId: "other" })).rejects.toMatchObject({ status: 403 });
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
