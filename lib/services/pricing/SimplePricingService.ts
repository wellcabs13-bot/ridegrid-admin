import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Actor, createRate, evidence, lock, savePolicy, transitionRate } from "./RateService";
import { date, object, policyData, text } from "./config";
import { Fee, PricingError, SERVICES, Tax, Terms, canonicalService, decimal, money, nonnegative, normalize, scopeKey } from "./engine";

export const activeVendorWhere = { deletedAt: null, isApproved: true, user: { isActive: true, deletedAt: null } } satisfies Prisma.VendorWhereInput;
export function pairWhere(vendorId: string): Prisma.VehicleWhereInput {
  return { vendorId, deletedAt: null, status: "AVAILABLE", vendor: activeVendorWhere,
    driver: { is: { deletedAt: null, status: "ACTIVE", user: { isActive: true, deletedAt: null } } } };
}
const pairSelect = { id: true, vendorId: true, driverId: true, make: true, model: true, registrationNumber: true, category: true,
  driver: { select: { id: true, firstName: true, lastName: true } } } satisfies Prisma.VehicleSelect;
const globalScope = { vendorId: "", service: "", city: "", route: "", vehicleCategory: "" };
export const toursGap = "No Tour catalog, Tour API or tour-to-vehicle pricing relationship exists in this project. Tours cannot be associated here yet.";

// The real location source already used by marketplace packages, supplemented by fleet home cities.
export async function pricingCities(db: Prisma.TransactionClient = prisma) {
  const [packages, vehicles] = await Promise.all([
    db.pricingPackage.findMany({ where: { isActive: true }, select: { city: true, fromCity: true, toCity: true, packageName: true } }),
    db.vehicle.findMany({ where: { deletedAt: null }, select: { homeCity: true } }),
  ]);
  const values = packages.flatMap(p => {
    const route = p.packageName.match(/^(.+?)\s+to\s+(.+)$/i);
    return [p.city, p.fromCity || route?.[1], p.toCity || route?.[2]];
  }).concat(vehicles.map(v => v.homeCity));
  const unique = new Map<string, string>();
  for (const value of values) if (value?.trim()) unique.set(normalize(value), value.trim());
  return [...unique.values()].sort((a, b) => a.localeCompare(b));
}

export async function simplePricingData(actor: Actor, role: string) {
  const vendorId = actor.vendorId;
  const [vendors, pairs, cities, rates, policies] = await Promise.all([
    prisma.vendor.findMany({ where: { ...activeVendorWhere, ...(!actor.admin && !actor.finance ? { id: vendorId } : {}) }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
    vendorId ? prisma.vehicle.findMany({ where: pairWhere(vendorId), select: pairSelect, orderBy: { registrationNumber: "asc" } }) : [],
    pricingCities(),
    vendorId ? prisma.pricingRateVersion.findMany({ where: { vendorId }, include: { pricingPackage: { select: { vehicleId: true, packageName: true, vehicle: { select: { make: true, model: true, registrationNumber: true, driver: { select: { id: true, firstName: true, lastName: true } } } } } } }, orderBy: { createdAt: "desc" }, take: 500 }) : [],
    prisma.pricingPolicy.findMany({ where: { ...globalScope, kind: { in: ["TAX", "FEE"] } }, orderBy: { version: "desc" } }),
  ]);
  return { role, vendorId, vendors, pairs, cities, rates, policies, tours: [], toursGap };
}

export function serviceInput(raw: unknown, cities: string[]) {
  const b = object(raw), service = text(b.service, "service");
  if (!["LOCAL", "ONE_WAY", "ROUNDTRIP"].includes(service)) throw new PricingError("INVALID_INPUT", "Choose Local, One-way or Roundtrip", 400);
  const city = cities.find(c => normalize(c) === normalize(text(b.city, "pickup city")));
  if (!city) throw new PricingError("INVALID_INPUT", "Choose a city from the available list", 400);
  let destinations = [""];
  if (service !== "LOCAL") {
    const selected = service === "ONE_WAY" ? [b.destination] : b.destinations;
    if (!Array.isArray(selected) || !selected.length || selected.length > 200) throw new PricingError("INVALID_INPUT", "Select at least one visit city (up to 200)", 400);
    destinations = [...new Set(selected.map(value => {
      const destination = cities.find(c => normalize(c) === normalize(text(value, "destination")));
      if (!destination || normalize(destination) === normalize(city)) throw new PricingError("INVALID_INPUT", "Pickup and destination must be different available cities", 400);
      return destination;
    }))];
  }
  const base: Partial<Terms> = { method: "FIXED", includedKm: "0", includedHours: "0", minimumKmPerDay: "0", perKm: "0", perHour: "0", driverAllowance: "0", waitingPerHour: "0", nightCharge: "0" };
  let fare: string, driverAllowance = "0";
  if (service === "LOCAL") {
    if (!["8_80", "12_120"].includes(String(b.package))) throw new PricingError("INVALID_INPUT", "Choose 8 Hrs / 80 Kms or 12 Hrs / 120 Kms", 400);
    const [hours, km] = String(b.package).split("_");
    Object.assign(base, { includedHours: hours, includedKm: km, perKm: nonnegative(b.extraKm, "Extra KM rate"), perHour: nonnegative(b.extraHour, "Extra hour rate") });
  }
  if (service === "ROUNDTRIP") {
    const km = nonnegative(b.kmPerDay, "KM per day"), perKm = nonnegative(b.perKm, "Rate per KM");
    if (!decimal(km).isInteger() || decimal(km).lte(0)) throw new PricingError("INVALID_INPUT", "KM per day must be a positive whole number", 400);
    driverAllowance = nonnegative(b.driverAllowance, "Driver allowance per day");
    fare = money(decimal(km).mul(perKm).plus(driverAllowance)).toFixed(2);
    Object.assign(base, { includedKm: km, minimumKmPerDay: km, perKm });
  } else fare = money(nonnegative(b.fare, "Base rate")).toFixed(2);
  if (service === "ONE_WAY") base.waitingPerHour = "250";
  return { service: service as "LOCAL" | "ONE_WAY" | "ROUNDTRIP", city, destinations, fare, driverAllowance, terms: base,
    canonical: service === "LOCAL" ? "LOCAL_HOURLY" : service === "ONE_WAY" ? "OUTSTATION_ONE_WAY" : "OUTSTATION_ROUND_TRIP" };
}

export async function saveSimpleRates(actor: Actor, raw: unknown) {
  const b = object(raw), vendorId = text(b.vendorId, "vendor");
  if (!actor.admin && (actor.finance || actor.vendorId !== vendorId)) throw new PricingError("FORBIDDEN", "You may manage only your own vendor prices", 403);
  if (!Array.isArray(b.pairs) || !b.pairs.length || b.pairs.length > 200) throw new PricingError("INVALID_INPUT", "Select between 1 and 200 car-driver pairs", 400);
  const selected = b.pairs.map(value => { const pair = object(value); return { vehicleId: text(pair.vehicleId, "car"), driverId: text(pair.driverId, "driver") }; });
  if (new Set(selected.map(pair => pair.vehicleId)).size !== selected.length) throw new PricingError("INVALID_INPUT", "Select each car only once", 400);
  const expected = object(b.expectedVersions), input = serviceInput(b, await pricingCities());
  if (selected.length * input.destinations.length > 200) throw new PricingError("INVALID_INPUT", "Save up to 200 vehicle and destination combinations at a time", 400);
  // A future boundary permits the existing approval service to close an earlier rate safely.
  const from = date(b.effectiveFrom, "start date");
  if (from <= new Date()) throw new PricingError("INVALID_INPUT", "Choose a future start time for these prices", 400);
  return prisma.$transaction(async tx => {
    const saved = [];
    for (const selection of [...selected].sort((a, b) => a.vehicleId.localeCompare(b.vehicleId))) {
      await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${selection.vehicleId} FOR UPDATE`;
      const pair = await tx.vehicle.findFirst({ where: { ...pairWhere(vendorId), id: selection.vehicleId, driverId: selection.driverId }, select: pairSelect });
      if (!pair?.driver) throw new PricingError("INVALID_INPUT", "A selected car or aligned driver is no longer active for this vendor. Reload and select again.", 400);
      const pricingType = input.service === "LOCAL" ? "LOCAL" : "OUTSTATION", tripType = input.service === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY";
      const rule = await tx.pricingRule.upsert({ where: { vendorId_vehicleCategory_pricingType_tripType: { vendorId, vehicleCategory: pair.category, pricingType, tripType } }, update: {}, create: { vendorId, vehicleCategory: pair.category, pricingType, tripType, chargeType: "FIXED", baseFare: 0 } });
      if (!rule.isActive) throw new PricingError("INVALID_INPUT", "This service is disabled for the vendor. Review it in Advanced first.", 400);
      for (const destination of [...input.destinations].sort()) {
        const name = input.service === "LOCAL" ? `${input.terms.includedHours} Hrs / ${input.terms.includedKm} Kms` : `${input.city} to ${destination}`;
        await lock(tx, `simple-package:${pair.id}:${input.canonical}:${normalize(input.city)}:${normalize(destination)}:${name}`);
        let pkg = await tx.pricingPackage.findFirst({ where: { pricingRuleId: rule.id, vehicleId: pair.id, city: { equals: input.city, mode: "insensitive" }, packageName: name } });
        if (!pkg) {
          pkg = await tx.pricingPackage.create({ data: { pricingRuleId: rule.id, vehicleId: pair.id, packageType: input.canonical, packageName: name, city: input.city, fromCity: input.service === "LOCAL" ? null : input.city, toCity: destination || null,
            includedHours: Number(input.terms.includedHours), includedKm: Number(input.terms.includedKm), baseFare: input.fare, extraKmRate: input.terms.perKm, extraHourRate: input.terms.perHour, driverAllowance: input.driverAllowance, isActive: true } });
          await evidence(tx, actor, pkg.id, null, { ...pkg, vendorId, action: "CREATE_SERVICE_IDENTITY" });
        }
        if (!pkg.isActive) throw new PricingError("INVALID_INPUT", "This vehicle package is disabled. Review it in Advanced first.", 400);
        const rateService = canonicalService((SERVICES as readonly string[]).includes(pkg.packageType) ? pkg.packageType : rule.pricingType, rule.tripType, pkg.transferDirection);
        const key = scopeKey({ vendorId, vehicleCategory: pair.category, service: rateService, city: input.city, origin: input.service === "LOCAL" ? "" : input.city, destination, pricingPackageId: pkg.id });
        const operational: NonNullable<Terms["operational"]> = { service: input.service, vehicleId: pair.id, driverId: pair.driver.id, driverName: `${pair.driver.firstName} ${pair.driver.lastName}`.trim(), car: `${pair.make} ${pair.model} — ${pair.registrationNumber}`, driverAllowancePerDay: input.driverAllowance,
          extraPickupDrop: input.service === "ONE_WAY" ? "250" : "0", waitingFreeMinutes: input.service === "ONE_WAY" ? "30" : "0", toll: "AS_APPLICABLE", parking: "AS_APPLICABLE" };
        const rate = await createRate(actor, { pricingRuleId: rule.id, pricingPackageId: pkg.id, service: rateService, fare: input.fare, effectiveFrom: from.toISOString(), expectedVersion: expected[key] ?? 0 }, tx, { ...input.terms, operational }, { allowMissingMaster: true });
        const submitted = await transitionRate(actor, rate.id, "submit", "", rate.version, tx);
        if (actor.admin && submitted.status === "PENDING") {
          saved.push(await transitionRate(
            actor,
            submitted.id,
            "approve",
            "Approved by Super Admin via Simple Pricing",
            submitted.version,
            tx
          ));
        } else {
          saved.push(submitted);
        }
      }
    }
    return { vehicleCount: selected.length, rateCount: saved.length, approved: saved.filter(rate => rate.status === "APPROVED").length, pending: saved.filter(rate => rate.status === "PENDING").length };
  }, { timeout: 60000 });
}

export async function saveSimplePolicy(actor: Actor, raw: unknown) {
  if (!actor.admin && !actor.finance) throw new PricingError("FORBIDDEN", "Only Super Admin or Finance can change GST and platform fees", 403);
  const b = object(raw), from = date(b.effectiveFrom, "Effective from"), expected = object(b.expectedVersions);
  return prisma.$transaction(async tx => {
    await lock(tx, "pricing-policy-writes");
    const rows = await tx.pricingPolicy.findMany({ where: { ...globalScope, kind: { in: ["TAX", "FEE"] } }, orderBy: { version: "desc" } });
    const current = (kind: string) => {
      const matching = rows.filter(row => row.kind === kind);
      if (new Set(matching.map(row => row.key)).size > 1) throw new PricingError("INVALID_INPUT", "Multiple central policies need review in Advanced before editing here", 400);
      return matching[0];
    };
    const fee = current("FEE"), tax = current("TAX");
    const existingTax = tax ? policyData("TAX", tax.data) as Tax[] : [];
    if (existingTax.length > 1) throw new PricingError("INVALID_INPUT", "This GST policy has multiple components. Use Advanced to preserve their allocation.", 400);
    const bases: Record<string, Tax["components"]> = { FARE: ["VENDOR_FARE"], FEE: ["PLATFORM_FEE"], BOTH: ["VENDOR_FARE", "PLATFORM_FEE"] };
    if (!existingTax.length && !bases[String(b.taxBase)]) throw new PricingError("INVALID_INPUT", "Choose what GST applies to", 400);
    const taxData = [{ ...(existingTax[0] || { name: "GST", jurisdiction: "IN", components: bases[String(b.taxBase)], deductVendorDiscount: false, deductPlatformDiscount: false }), rate: nonnegative(b.gst, "GST percentage") }];
    const feeData = { ...(fee ? policyData("FEE", fee.data) as Fee : { fixed: "0", minimum: "0", processingFixed: "0", processingPercent: "0", waive: false }), percent: nonnegative(b.fee, "Platform fee percentage") };
    const saved = [];
    for (const item of [{ kind: "TAX", old: tax, data: taxData, name: "Central GST" }, { kind: "FEE", old: fee, data: feeData, name: "Central platform fee" }]) {
      saved.push(await savePolicy(actor, { ...globalScope, kind: item.kind, key: item.old?.key || `simple-central-${item.kind.toLowerCase()}`, name: item.old?.name || item.name,
        data: item.data, expectedVersion: expected[item.kind] ?? 0, effectiveFrom: from.toISOString() }, tx));
    }
    return saved;
  });
}
