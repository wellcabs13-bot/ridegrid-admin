import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Actor, createRate, evidence, lock, savePolicy, transitionRate } from "./RateService";
import { date, object, policyData, text } from "./config";
import { Fee, OperationalTerms, PricingError, SERVICES, Service, Tax, Terms, canonicalService, decimal, money, nonnegative, normalize, scopeKey } from "./engine";
import { PricingCatalog, catalogCity, cityKey, pricingCatalog } from "./catalog";

export const activeVendorWhere = { deletedAt: null, isApproved: true, user: { isActive: true, deletedAt: null } } satisfies Prisma.VendorWhereInput;
export function pairWhere(vendorId: string): Prisma.VehicleWhereInput {
  return { vendorId, deletedAt: null, status: "AVAILABLE", vendor: activeVendorWhere,
    driver: { is: { deletedAt: null, status: "ACTIVE", user: { isActive: true, deletedAt: null } } } };
}
const pairSelect = { id: true, vendorId: true, driverId: true, make: true, model: true, registrationNumber: true, category: true,
  driver: { select: { id: true, firstName: true, lastName: true } } } satisfies Prisma.VehicleSelect;
type Pair = Prisma.VehicleGetPayload<{ select: typeof pairSelect }>;
const globalScope = { vendorId: "", service: "", city: "", route: "", vehicleCategory: "" };
type Simple = OperationalTerms["service"];
const CANONICAL: Record<Simple, Service> = { LOCAL: "LOCAL_HOURLY", ONE_WAY: "OUTSTATION_ONE_WAY", ROUNDTRIP: "OUTSTATION_ROUND_TRIP", TOUR: "TOUR_PACKAGE" };
// Tours are fixed-price outstation circuits; their packages carry TOUR_PACKAGE so they are
// quoted and listed only as Tours, never as point-to-point outstation routes.
const RULE: Record<Simple, { pricingType: "LOCAL" | "OUTSTATION"; tripType: "ONEWAY" | "ROUNDTRIP" }> = {
  LOCAL: { pricingType: "LOCAL", tripType: "ONEWAY" }, ONE_WAY: { pricingType: "OUTSTATION", tripType: "ONEWAY" },
  ROUNDTRIP: { pricingType: "OUTSTATION", tripType: "ROUNDTRIP" }, TOUR: { pricingType: "OUTSTATION", tripType: "ROUNDTRIP" },
};
const liveWhere = (statuses: string[], now = new Date()): Prisma.PricingRateVersionWhereInput => ({ status: { in: statuses }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] });

/** Operating cities for pricing: the published website city/route/tour catalog. */
export function pricingCities(catalog: PricingCatalog = pricingCatalog()) { return catalog.cities; }

export async function simplePricingData(actor: Actor, role: string) {
  const vendorId = actor.vendorId, catalog = pricingCatalog();
  const [vendors, pairs, rates, current, policies] = await Promise.all([
    prisma.vendor.findMany({ where: { ...activeVendorWhere, ...(!actor.admin && !actor.finance ? { id: vendorId } : {}) }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" } }),
    vendorId ? prisma.vehicle.findMany({ where: pairWhere(vendorId), select: pairSelect, orderBy: { registrationNumber: "asc" } }) : [],
    vendorId ? prisma.pricingRateVersion.findMany({ where: { vendorId }, include: { pricingPackage: { select: { vehicleId: true, packageName: true, vehicle: { select: { make: true, model: true, registrationNumber: true, driver: { select: { id: true, firstName: true, lastName: true } } } } } } }, orderBy: { createdAt: "desc" }, take: 500 }) : [],
    // Every live price for the vendor (not just the latest 500 versions) so the bulk grids prefill reliably.
    vendorId ? prisma.pricingRateVersion.findMany({ where: { vendorId, pricingPackageId: { not: null }, ...liveWhere(["APPROVED", "PENDING"]) }, select: { pricingPackageId: true, version: true, status: true, service: true, fare: true, terms: true, pricingPackage: { select: { vehicleId: true, packageName: true, city: true, toCity: true } } }, orderBy: { version: "desc" } }) : [],
    prisma.pricingPolicy.findMany({ where: { ...globalScope, kind: { in: ["TAX", "FEE"] } }, orderBy: { version: "desc" } }),
  ]);
  const seen = new Set<string>();
  const prices = current.flatMap(rate => {
    if (!rate.pricingPackage || seen.has(rate.pricingPackageId!)) return [];
    seen.add(rate.pricingPackageId!);
    const terms = rate.terms as unknown as Terms;
    return [{ vehicleId: rate.pricingPackage.vehicleId, service: rate.service, city: rate.pricingPackage.city || "", destination: rate.pricingPackage.toCity || "", packageName: rate.pricingPackage.packageName, status: rate.status,
      fare: money(rate.fare).toFixed(2), baseKm: terms.includedKm || "", perKm: terms.perKm || "", driverAllowance: terms.operational?.driverAllowancePerDay || "", notes: terms.operational?.notes || "" }];
  });
  return { role, vendorId, vendors, pairs, cities: catalog.cities, catalog, rates, prices, policies };
}

/** Local (8H/80KM, 12H/120KM) price for a catalog operating city. */
export function serviceInput(raw: unknown, cities: string[]) {
  const b = object(raw);
  if (text(b.service, "service") !== "LOCAL") throw new PricingError("INVALID_INPUT", "One-way, Roundtrip and Tour prices are saved from their route grids", 400);
  const city = cities.find(c => cityKey(c) === cityKey(text(b.city, "city")));
  if (!city) throw new PricingError("INVALID_INPUT", "Choose a city from RideGrid's operating cities", 400);
  if (!["8_80", "12_120"].includes(String(b.package))) throw new PricingError("INVALID_INPUT", "Choose 8 Hrs / 80 Kms or 12 Hrs / 120 Kms", 400);
  const [hours, km] = String(b.package).split("_");
  const fare = positive(b.fare, "Base rate");
  const terms: Partial<Terms> = { ...baseTerms(), includedHours: hours, includedKm: km, perKm: nonnegative(b.extraKm, "Extra KM rate"), perHour: nonnegative(b.extraHour, "Extra hour rate") };
  return { service: "LOCAL" as const, city, destination: "", name: `${hours} Hrs / ${km} Kms`, fare, driverAllowance: "0", terms };
}

function baseTerms(): Partial<Terms> {
  return { method: "FIXED", includedKm: "0", includedHours: "0", minimumKmPerDay: "0", perKm: "0", perHour: "0", driverAllowance: "0", waitingPerHour: "0", nightCharge: "0" };
}
const blank = (value: unknown) => value === undefined || value === null || String(value).trim() === "";
function positive(value: unknown, name: string) {
  const fare = money(nonnegative(typeof value === "string" ? value.trim() : value, name));
  if (fare.lte(0)) throw new PricingError("INVALID_INPUT", `${name} must be more than ₹0. Leave it blank to stop offering it.`, 400);
  return fare.toFixed(2);
}

export interface RateSpec { service: Simple; city: string; destination: string; name: string; fare: string; driverAllowance: string; terms: Partial<Terms>; notes?: string }
export type BulkRow = { key: string; destination: string; name: string; spec: RateSpec | null };

/** Validates a One-way / Roundtrip / Tour grid against the website route catalog. A blank
 * (or, for Roundtrip, incomplete) row means the selected cars are not offered on it. */
export function bulkInput(raw: unknown, catalog: PricingCatalog) {
  const b = object(raw), service = text(b.service, "service");
  if (service !== "ONE_WAY" && service !== "ROUNDTRIP" && service !== "TOUR") throw new PricingError("INVALID_INPUT", "Choose One-way, Roundtrip or Tours", 400);
  const city = catalogCity(catalog, b.city);
  if (!city) throw new PricingError("INVALID_INPUT", "Choose a pickup city from RideGrid's operating cities", 400);
  if (!Array.isArray(b.rows) || !b.rows.length || b.rows.length > 150) throw new PricingError("INVALID_INPUT", "Send between 1 and 150 routes", 400);
  const seen = new Set<string>();
  const rows: BulkRow[] = b.rows.map(value => {
    const row = object(value);
    let key: string, destination: string, name: string;
    if (service === "TOUR") {
      const tour = (catalog.tours[city] || []).find(t => t.slug === row.tour);
      if (!tour) throw new PricingError("INVALID_INPUT", `A tour is not published for ${city}. Reload and try again.`, 400);
      key = tour.slug; destination = tour.name; name = tour.title;
    } else {
      const requested = text(row.destination, "destination");
      if (cityKey(requested) === cityKey(city)) throw new PricingError("INVALID_INPUT", "Pickup and destination must be different cities", 400);
      const match = (catalog.routes[city] || []).find(d => cityKey(d) === cityKey(requested));
      if (!match) throw new PricingError("INVALID_INPUT", `${requested} is not a published RideGrid route from ${city}`, 400);
      key = cityKey(match); destination = match; name = `${city} to ${match}`;
    }
    if (seen.has(key)) throw new PricingError("INVALID_INPUT", `${destination} is listed more than once`, 400);
    seen.add(key);
    const base = { service: service as Simple, city, destination, name };
    if (service === "ROUNDTRIP") {
      if ([row.baseKm, row.perKm, row.driverAllowance].some(blank)) return { key, destination, name, spec: null };
      const km = nonnegative(String(row.baseKm).trim(), `Base KM for ${destination}`), perKm = nonnegative(String(row.perKm).trim(), `Per KM for ${destination}`);
      if (!decimal(km).isInteger() || decimal(km).lte(0)) throw new PricingError("INVALID_INPUT", `Base KM for ${destination} must be a positive whole number`, 400);
      if (decimal(perKm).lte(0)) throw new PricingError("INVALID_INPUT", `Per KM for ${destination} must be more than ₹0`, 400);
      const allowance = money(nonnegative(String(row.driverAllowance).trim(), `Driver allowance for ${destination}`)).toFixed(2);
      const fare = money(decimal(km).mul(perKm).plus(allowance)).toFixed(2);
      return { key, destination, name, spec: { ...base, fare, driverAllowance: allowance, terms: { ...baseTerms(), includedKm: km, minimumKmPerDay: km, perKm } } };
    }
    if (blank(row.fare)) return { key, destination, name, spec: null };
    const notes = service === "TOUR" && typeof row.notes === "string" ? row.notes.trim() : "";
    if (notes.length > 500) throw new PricingError("INVALID_INPUT", `Notes for ${destination} must be 500 characters or fewer`, 400);
    return { key, destination, name, spec: { ...base, fare: positive(row.fare, `Price for ${destination}`), driverAllowance: "0", terms: { ...baseTerms(), ...(service === "ONE_WAY" ? { waitingPerHour: "250" } : {}) }, ...(notes ? { notes } : {}) } };
  });
  return { service: service as Simple, city, rows };
}

function selection(actor: Actor, b: Record<string, unknown>) {
  const vendorId = text(b.vendorId, "vendor");
  if (!actor.admin && (actor.finance || actor.vendorId !== vendorId)) throw new PricingError("FORBIDDEN", "You may manage only your own vendor prices", 403);
  if (!Array.isArray(b.pairs) || !b.pairs.length || b.pairs.length > 200) throw new PricingError("INVALID_INPUT", "Select between 1 and 200 car-driver pairs", 400);
  const pairs = b.pairs.map(value => { const pair = object(value); return { vehicleId: text(pair.vehicleId, "car"), driverId: text(pair.driverId, "driver") }; });
  if (new Set(pairs.map(pair => pair.vehicleId)).size !== pairs.length) throw new PricingError("INVALID_INPUT", "Select each car only once", 400);
  return { vendorId, pairs: pairs.sort((x, y) => x.vehicleId.localeCompare(y.vehicleId)) };
}
async function lockPair(tx: Prisma.TransactionClient, vendorId: string, selected: { vehicleId: string; driverId: string }) {
  await tx.$queryRaw`SELECT id FROM "Vehicle" WHERE id = ${selected.vehicleId} FOR UPDATE`;
  const pair = await tx.vehicle.findFirst({ where: { ...pairWhere(vendorId), id: selected.vehicleId, driverId: selected.driverId }, select: pairSelect });
  if (!pair?.driver) throw new PricingError("INVALID_INPUT", "A selected car or aligned driver is no longer active for this vendor. Reload and select again.", 400);
  return pair as Pair & { driver: NonNullable<Pair["driver"]> };
}
async function ruleFor(tx: Prisma.TransactionClient, vendorId: string, pair: Pair, service: Simple) {
  const rule = await tx.pricingRule.upsert({ where: { vendorId_vehicleCategory_pricingType_tripType: { vendorId, vehicleCategory: pair.category, ...RULE[service] } }, update: {}, create: { vendorId, vehicleCategory: pair.category, ...RULE[service], chargeType: "FIXED", baseFare: 0 } });
  if (!rule.isActive) throw new PricingError("INVALID_INPUT", "This service is disabled for the vendor. Review it in Advanced first.", 400);
  return rule;
}
const findPackage = (tx: Prisma.TransactionClient, ruleId: string, vehicleId: string, spec: Pick<RateSpec, "city" | "name">) =>
  tx.pricingPackage.findFirst({ where: { pricingRuleId: ruleId, vehicleId, city: { equals: spec.city, mode: "insensitive" }, packageName: { equals: spec.name, mode: "insensitive" } } });

function unchanged(rate: { fare: Prisma.Decimal; terms: Prisma.JsonValue }, spec: RateSpec, driverId: string) {
  const t = rate.terms as unknown as Terms, o = t.operational;
  const same = (a: unknown, b: unknown) => decimal(String(a || "0")).eq(String(b || "0"));
  return !!o && o.driverId === driverId && money(rate.fare).eq(spec.fare) && (o.notes || "") === (spec.notes || "") && same(o.driverAllowancePerDay, spec.driverAllowance)
    && (["includedKm", "includedHours", "perKm", "perHour", "waitingPerHour"] as const).every(k => same(t[k], spec.terms[k]));
}

async function writeRate(tx: Prisma.TransactionClient, actor: Actor, vendorId: string, pair: Pair & { driver: NonNullable<Pair["driver"]> }, spec: RateSpec, from: Date, expected: Record<string, unknown>) {
  const rule = await ruleFor(tx, vendorId, pair, spec.service), canonical = CANONICAL[spec.service];
  await lock(tx, `simple-package:${pair.id}:${canonical}:${cityKey(spec.city)}:${cityKey(spec.destination)}:${normalize(spec.name)}`);
  let pkg = await findPackage(tx, rule.id, pair.id, spec);
  if (!pkg) {
    pkg = await tx.pricingPackage.create({ data: { pricingRuleId: rule.id, vehicleId: pair.id, packageType: canonical, packageName: spec.name, city: spec.city, fromCity: spec.service === "LOCAL" ? null : spec.city, toCity: spec.destination || null,
      includedHours: Number(spec.terms.includedHours), includedKm: Number(spec.terms.includedKm), baseFare: spec.fare, extraKmRate: spec.terms.perKm, extraHourRate: spec.terms.perHour, driverAllowance: spec.driverAllowance, isActive: true } });
    await evidence(tx, actor, pkg.id, null, { ...pkg, vendorId, action: "CREATE_SERVICE_IDENTITY" });
  }
  if (!pkg.isActive) throw new PricingError("INVALID_INPUT", `The ${spec.name} package for ${pair.registrationNumber} is disabled. Review it in Advanced first.`, 400);
  const latest = await tx.pricingRateVersion.findFirst({ where: { pricingPackageId: pkg.id, ...liveWhere(["APPROVED", "PENDING"]) }, orderBy: { version: "desc" } });
  if (latest && unchanged(latest, spec, pair.driver.id)) return { status: "UNCHANGED" };
  const rateService = canonicalService((SERVICES as readonly string[]).includes(pkg.packageType) ? pkg.packageType : rule.pricingType, rule.tripType, pkg.transferDirection);
  const key = scopeKey({ vendorId, vehicleCategory: pair.category, service: rateService, city: pkg.city || "", origin: pkg.fromCity || "", destination: pkg.toCity || "", pricingPackageId: pkg.id });
  const previous = await tx.pricingRateVersion.findFirst({ where: { scopeKey: key }, orderBy: { version: "desc" }, select: { version: true } });
  const operational: OperationalTerms = { service: spec.service, vehicleId: pair.id, driverId: pair.driver.id, driverName: `${pair.driver.firstName} ${pair.driver.lastName}`.trim(), car: `${pair.make} ${pair.model} — ${pair.registrationNumber}`, driverAllowancePerDay: spec.driverAllowance,
    extraPickupDrop: spec.service === "ONE_WAY" ? "250" : "0", waitingFreeMinutes: spec.service === "ONE_WAY" ? "30" : "0", toll: "AS_APPLICABLE", parking: "AS_APPLICABLE", ...(spec.notes ? { notes: spec.notes } : {}) };
  const rate = await createRate(actor, { pricingRuleId: rule.id, pricingPackageId: pkg.id, service: rateService, fare: spec.fare, effectiveFrom: from.toISOString(), expectedVersion: expected[key] ?? previous?.version ?? 0 }, tx, { ...spec.terms, operational }, { allowMissingMaster: true });
  const submitted = await transitionRate(actor, rate.id, "submit", "", rate.version, tx);
  return actor.admin && submitted.status === "PENDING" ? transitionRate(actor, submitted.id, "approve", "Approved by Super Admin via Simple Pricing", submitted.version, tx) : submitted;
}

/** Stops offering a car on a route: deactivates its current and scheduled versions; history is kept. */
async function clearRate(tx: Prisma.TransactionClient, actor: Actor, vendorId: string, pair: Pair, service: Simple, spec: Pick<RateSpec, "city" | "name">) {
  const rule = await tx.pricingRule.findUnique({ where: { vendorId_vehicleCategory_pricingType_tripType: { vendorId, vehicleCategory: pair.category, ...RULE[service] } } });
  const pkg = rule && await findPackage(tx, rule.id, pair.id, spec);
  if (!pkg) return 0;
  const versions = await tx.pricingRateVersion.findMany({ where: { pricingPackageId: pkg.id, ...liveWhere(["APPROVED", "PENDING", "DRAFT"]) }, select: { id: true, version: true }, orderBy: { version: "asc" } });
  for (const version of versions) await transitionRate(actor, version.id, "deactivate", "Price cleared in bulk pricing", version.version, tx);
  return versions.length;
}

function summary(vehicleCount: number, saved: { status: string }[], cleared = 0) {
  return { vehicleCount, rateCount: saved.filter(rate => rate.status !== "UNCHANGED").length, approved: saved.filter(rate => rate.status === "APPROVED").length,
    pending: saved.filter(rate => rate.status === "PENDING").length, unchanged: saved.filter(rate => rate.status === "UNCHANGED").length, cleared };
}

export async function saveSimpleRates(actor: Actor, raw: unknown) {
  const b = object(raw), { vendorId, pairs } = selection(actor, b);
  const spec = serviceInput(b, pricingCities()), expected = object(b.expectedVersions);
  // A future boundary permits the existing approval service to close an earlier rate safely.
  const from = date(b.effectiveFrom, "start date");
  if (from <= new Date()) throw new PricingError("INVALID_INPUT", "Choose a future start time for these prices", 400);
  return prisma.$transaction(async tx => {
    const saved = [];
    for (const selected of pairs) saved.push(await writeRate(tx, actor, vendorId, await lockPair(tx, vendorId, selected), spec, from, expected));
    return summary(pairs.length, saved);
  }, { timeout: 60000 });
}

/** One grid save for every selected car: priced rows get a new version (unchanged ones are
 * skipped), blank rows remove that car from the route. All or nothing. */
export async function saveBulkRates(actor: Actor, raw: unknown) {
  const b = object(raw), { vendorId, pairs } = selection(actor, b), input = bulkInput(b, pricingCatalog()), expected = object(b.expectedVersions ?? {});
  if (pairs.length * input.rows.length > 600) throw new PricingError("INVALID_INPUT", "Save up to 600 car and route combinations at a time. Select fewer cars.", 400);
  const priced = input.rows.filter(row => row.spec);
  const from = date(b.effectiveFrom, "start date");
  if (priced.length && from <= new Date()) throw new PricingError("INVALID_INPUT", "Choose a future start time for these prices", 400);
  return prisma.$transaction(async tx => {
    const saved: { status: string }[] = [];
    let cleared = 0;
    for (const selected of pairs) {
      const pair = await lockPair(tx, vendorId, selected);
      for (const row of [...input.rows].sort((x, y) => x.key.localeCompare(y.key))) {
        if (row.spec) saved.push(await writeRate(tx, actor, vendorId, pair, row.spec, from, expected));
        else cleared += await clearRate(tx, actor, vendorId, pair, input.service, { city: input.city, name: row.name });
      }
    }
    return { ...summary(pairs.length, saved, cleared), service: input.service, city: input.city, routesPriced: priced.length, routesBlank: input.rows.length - priced.length };
  }, { timeout: 280000, maxWait: 10000 });
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
