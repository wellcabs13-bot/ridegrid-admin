import { Prisma, PricingPolicy, PricingRateVersion, VehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Band, PricingError, Scope, SERVICES, Terms, decimal, effective, inBand, money, nonnegative, normalize, scopeKey } from "./engine";
import { Kind, KINDS, date, object, policyData, text } from "./config";

export type Actor = { id: string; admin: boolean; finance: boolean; vendorId?: string };
export const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value));
export async function lock(tx: Prisma.TransactionClient, key: string) { await tx.$queryRaw`WITH advisory_lock AS (SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))) SELECT 1::int AS "locked" FROM advisory_lock`; }
export async function evidence(tx: Prisma.TransactionClient, actor: Actor, entityId: string, oldValue: unknown, newValue: unknown) {
  // Same existing AuditLog contract, inside the pricing transaction: audit failure rolls back the write.
  await tx.auditLog.create({ data: { userId: actor.id, action: oldValue ? "UPDATE" : "CREATE", entityName: "Pricing", entityId, ...(oldValue ? { oldValue: json(oldValue) } : {}), newValue: json(newValue) } });
}
export function applicable(p: PricingPolicy, s: Scope, at: Date) {
  return p.active && effective(p, at) && (!p.vendorId || p.vendorId === s.vendorId) && (!p.service || p.service === s.service) && (!p.vehicleCategory || p.vehicleCategory === s.vehicleCategory) && (!p.city || normalize(p.city) === normalize(s.city)) && (!p.route || p.route === `${normalize(s.origin)}|${normalize(s.destination)}`);
}
export function selectPolicy(policies: PricingPolicy[], kind: Kind, scope: Scope, at: Date, required = true) {
  const candidates = policies.filter(p => p.kind === kind && applicable(p, scope, at)).map(p => ({ p, score: (p.vendorId ? 16 : 0) + (p.route ? 8 : 0) + (p.city ? 4 : 0) + (p.service ? 2 : 0) + (p.vehicleCategory ? 1 : 0) })).sort((a,b) => b.score - a.score);
  if (!candidates.length) { if (required) throw new PricingError("CONFIGURATION_REQUIRED", `${kind} configuration is required`); return null; }
  if (candidates[1]?.score === candidates[0].score) throw new PricingError("CONFLICTING_POLICIES", `Conflicting ${kind} policies`);
  return candidates[0].p;
}
function own(actor: Actor, vendorId: string) { if (!actor.admin && actor.vendorId !== vendorId) throw new PricingError("FORBIDDEN", "You may manage only your own fares", 403); }
function interval(from: Date, to: Date | null) { if (to && to <= from) throw new PricingError("INVALID_INPUT", "Effective To must follow Effective From", 400); }
function smartBand(fare: Prisma.Decimal | null, band: Band | null, service: string) {
  if (fare && (service !== "OUTSTATION_ONE_WAY" || !band?.smartMinimum || !band?.smartMaximum || fare.lt(band.smartMinimum) || fare.gt(band.smartMaximum))) throw new PricingError("SMART_RETURN_OUTSIDE_BAND", "Smart Return requires an approved one-way band");
}
export async function createRate(actor: Actor, raw: unknown, transaction?: Prisma.TransactionClient, serviceTerms?: Partial<Terms>, options?: { allowMissingMaster?: boolean }) {
  const b = object(raw), ruleId = text(b.pricingRuleId, "rate card"), service = text(b.service, "service");
  if (!(SERVICES as readonly string[]).includes(service)) throw new PricingError("INVALID_INPUT", "Unknown service", 400);
  const from = date(b.effectiveFrom, "Effective From"), to = b.effectiveTo ? date(b.effectiveTo, "Effective To") : null;
  interval(from, to);
  const fare = money(nonnegative(b.fare, "Your Fare"));
  const smartReturnFare = b.smartReturnFare === undefined || b.smartReturnFare === "" || b.smartReturnFare === null ? null : money(nonnegative(b.smartReturnFare, "Smart Return fare"));
  const work = async (tx: Prisma.TransactionClient) => {
    const rule = await tx.pricingRule.findUniqueOrThrow({ where: { id: ruleId } });
    own(actor, rule.vendorId);
    const packageId = typeof b.pricingPackageId === "string" && b.pricingPackageId ? b.pricingPackageId : null;
    const pkg = packageId ? await tx.pricingPackage.findFirst({ where: { id: packageId, pricingRuleId: rule.id } }) : null;
    if (packageId && !pkg) throw new PricingError("INVALID_INPUT", "Package does not belong to rate card", 400);
    const route = pkg && rule.pricingType === "OUTSTATION" ? pkg.packageName.match(/^(.+?)\s+to\s+(.+)$/i) : null;
    const s: Scope = { vendorId: rule.vendorId, vehicleCategory: rule.vehicleCategory, service, pricingPackageId: packageId || undefined, city: normalize(pkg?.city || String(b.city || "")), origin: normalize(pkg?.fromCity || route?.[1] || String(b.origin || "")), destination: normalize(pkg?.toCity || route?.[2] || String(b.destination || "")), area: normalize(pkg?.airportName || String(b.area || "")) };
    if (!!s.origin !== !!s.destination) throw new PricingError("INVALID_INPUT", "Both route endpoints are required", 400);
    const key = scopeKey(s); await lock(tx, key);
    const previous = await tx.pricingRateVersion.findFirst({ where: { scopeKey: key }, orderBy: { version: "desc" } });
    if (b.expectedVersion !== (previous?.version || 0)) throw new PricingError("VERSION_CONFLICT", "The rate changed. Reload before saving.");
    const policies = await tx.pricingPolicy.findMany({ where: { active: true } });
    const master = selectPolicy(policies, "MASTER", s, from, !options?.allowMissingMaster);
    const bandPolicy = selectPolicy(policies, "BAND", s, from, false);
    const band = bandPolicy ? policyData("BAND", bandPolicy.data) as Band : null;
    smartBand(smartReturnFare, band, service);
    const created = await tx.pricingRateVersion.create({ data: { pricingRuleId: rule.id, pricingPackageId: packageId, scopeKey: key, vendorId: rule.vendorId, vehicleCategory: rule.vehicleCategory, service, city: s.city, origin: s.origin, destination: s.destination, area: s.area, version: (previous?.version || 0) + 1, effectiveFrom: from, effectiveTo: to, fare, smartReturnFare, terms: json({ ...(master ? object(master.data) : {}), ...serviceTerms, ...(master ? { masterPolicyId: master.id, masterPolicyVersion: master.version } : {}) }), createdBy: actor.id } });
    await evidence(tx, actor, created.id, null, created);
    return created;
  };
  return transaction ? work(transaction) : prisma.$transaction(work);
}
export async function transitionRate(actor: Actor, id: string, action: string, reason: string, expectedVersion: number, transaction?: Prisma.TransactionClient) {
  const work = async (tx: Prisma.TransactionClient) => {
    const original = await tx.pricingRateVersion.findUniqueOrThrow({ where: { id } });
    own(actor, original.vendorId); await lock(tx, original.scopeKey);
    const r = await tx.pricingRateVersion.findUniqueOrThrow({ where: { id } });
    if (r.version !== expectedVersion) throw new PricingError("VERSION_CONFLICT");
    let status: string;
    if (action === "submit" && r.status === "DRAFT") status = "PENDING";
    else if (action === "approve" && r.status === "PENDING" && actor.admin) status = "APPROVED";
    else if (action === "reject" && r.status === "PENDING" && actor.admin && reason.trim()) status = "REJECTED";
    else if (action === "deactivate" && ["APPROVED", "PENDING", "DRAFT"].includes(r.status)) status = "INACTIVE";
    else throw new PricingError("INVALID_TRANSITION", "This action is not permitted", 403);
    if (status === "PENDING" || status === "APPROVED") {
      const policies = await tx.pricingPolicy.findMany({ where: { active: true } });
      const p = selectPolicy(policies, "BAND", r, r.effectiveFrom, false);
      const band = p ? policyData("BAND", p.data) as Band : null;
      smartBand(r.smartReturnFare, band, r.service);
      if (status === "PENDING" && band && inBand(r.fare, band, true)) status = "APPROVED";
      if (status === "APPROVED" && (!band || !inBand(r.fare, band)) && (!actor.admin || !reason.trim())) throw new PricingError("APPROVAL_REASON_REQUIRED", "Outside-band approval requires Super Admin and a reason");
    }
    if (status === "APPROVED") {
      if (r.effectiveTo && r.effectiveTo <= new Date()) throw new PricingError("RATE_EXPIRED");
      const overlaps = await tx.pricingRateVersion.findMany({ where: { scopeKey: r.scopeKey, status: "APPROVED", id: { not: id }, effectiveFrom: { lt: r.effectiveTo || new Date("9999-01-01") }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: r.effectiveFrom } }] } });
      for (const old of overlaps) {
        // A replacement may close its predecessor at a future boundary, never rewrite past quotes.
        if (old.effectiveFrom >= r.effectiveFrom || r.effectiveFrom < new Date()) throw new PricingError("OVERLAPPING_RATE", "Choose a future Effective From after the current version");
        await tx.pricingRateVersion.update({ where: { id: old.id }, data: { effectiveTo: r.effectiveFrom } });
        await evidence(tx, actor, old.id, old, { effectiveTo: r.effectiveFrom, replacedBy: id });
      }
    }
    const updated = await tx.pricingRateVersion.update({ where: { id }, data: { status, ...(status === "INACTIVE" ? { deactivatedAt: new Date() } : {}), ...(["APPROVED", "REJECTED"].includes(status) ? { reviewedBy: actor.id, reviewedAt: new Date(), reviewReason: reason || "Within auto-approval band" } : {}) } });
    await evidence(tx, actor, id, r, updated); return updated;
  };
  return transaction ? work(transaction) : prisma.$transaction(work);
}
export async function savePolicy(actor: Actor, raw: unknown, transaction?: Prisma.TransactionClient) {
  const b = object(raw), kind = text(b.kind, "kind") as Kind;
  if (!KINDS.includes(kind)) throw new PricingError("INVALID_INPUT", "Invalid policy kind", 400);
  if (!actor.admin && !(actor.finance && ["FEE", "TAX", "DISCOUNT"].includes(kind))) throw new PricingError("FORBIDDEN", "This policy requires Super Admin or Finance permission", 403);
  const data = policyData(kind, b.data), key = text(b.key, "policy key"), from = date(b.effectiveFrom, "Effective From"), to = b.effectiveTo ? date(b.effectiveTo, "Effective To") : null;
  interval(from, to);
  const service = typeof b.service === "string" ? b.service : "", category = typeof b.vehicleCategory === "string" ? b.vehicleCategory : "";
  if (service && !(SERVICES as readonly string[]).includes(service)) throw new PricingError("INVALID_INPUT", "Invalid service", 400);
  if (category && !Object.values(VehicleCategory).includes(category as VehicleCategory)) throw new PricingError("INVALID_INPUT", "Invalid vehicle category", 400);
  const work = async (tx: Prisma.TransactionClient) => {
    await lock(tx, "pricing-policy-writes");
    const old = await tx.pricingPolicy.findFirst({ where: { key }, orderBy: { version: "desc" } });
    if ((old?.version || 0) !== b.expectedVersion) throw new PricingError("VERSION_CONFLICT");
    const scope = { kind, city: normalize(String(b.city || "")), service, vehicleCategory: category, vendorId: typeof b.vendorId === "string" ? b.vendorId : "", route: normalize(String(b.route || "")) };
    if (old && ["kind", "city", "service", "vehicleCategory", "vendorId", "route"].some(k => old[k as keyof typeof scope] !== scope[k as keyof typeof scope])) throw new PricingError("INVALID_INPUT", "A new scope requires a new policy key", 400);
    if (scope.vendorId && !await tx.vendor.findUnique({ where: { id: scope.vendorId } })) throw new PricingError("INVALID_INPUT", "Unknown vendor", 400);
    const conflicting = await tx.pricingPolicy.findFirst({ where: { ...scope, key: { not: key }, active: true, effectiveFrom: { lt: to || new Date("9999-01-01") }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: from } }] } });
    if (conflicting) throw new PricingError("CONFLICTING_POLICIES");
    if (old) {
      if (from <= old.effectiveFrom || from < new Date()) throw new PricingError("INVALID_INPUT", "Policy versions require a future effective boundary", 400);
      if (!old.effectiveTo || old.effectiveTo > from) await tx.pricingPolicy.update({ where: { id: old.id }, data: { effectiveTo: from } });
    }
    const p = await tx.pricingPolicy.create({ data: { key, version: (old?.version || 0) + 1, name: text(b.name, "name"), ...scope, effectiveFrom: from, effectiveTo: to, active: b.active !== false, data: json(data), createdBy: actor.id } });
    await evidence(tx, actor, p.id, old, p); return p;
  };
  return transaction ? work(transaction) : prisma.$transaction(work);
}

// ---- Set-based equivalents used by the bulk pricing grids ----------------------------
// Same scope keys, advisory locks, version numbering, MASTER/BAND selection, auto-approval,
// outside-band reason rule, overlap closing and audit trail as createRate → submit →
// (Super Admin) approve, and as deactivate — with a fixed number of queries per batch
// instead of ~20 sequential queries per rate.
export async function lockMany(tx: Prisma.TransactionClient, keys: string[]) {
  const sorted = [...new Set(keys)].sort();
  if (sorted.length) await tx.$queryRaw`SELECT count(*)::int AS "locked" FROM (SELECT pg_advisory_xact_lock(hashtextextended(k, 0)) FROM unnest(${sorted}::text[]) AS k) AS locks`;
}
/** The scope createRate derives from a package and its rate card. */
export function packageScope(rule: { vendorId: string; vehicleCategory: string; pricingType: string }, pkg: { id: string; packageName: string; city: string | null; fromCity: string | null; toCity: string | null; airportName: string | null }, service: string): Scope {
  const route = rule.pricingType === "OUTSTATION" ? pkg.packageName.match(/^(.+?)\s+to\s+(.+)$/i) : null;
  return { vendorId: rule.vendorId, vehicleCategory: rule.vehicleCategory, service, pricingPackageId: pkg.id, city: normalize(pkg.city), origin: normalize(pkg.fromCity || route?.[1] || ""), destination: normalize(pkg.toCity || route?.[2] || ""), area: normalize(pkg.airportName) };
}
export interface BatchRate { pricingRuleId: string; scope: Scope; fare: string; terms: Partial<Terms>; expectedVersion?: number }
const auditRow = (actor: Actor, entityId: string, oldValue: unknown, newValue: unknown): Prisma.AuditLogCreateManyInput =>
  ({ userId: actor.id, action: oldValue ? "UPDATE" : "CREATE", entityName: "Pricing", entityId, ...(oldValue ? { oldValue: json(oldValue) } : {}), newValue: json(newValue) });

export async function createRatesBatch(actor: Actor, items: BatchRate[], from: Date, approveReason: string, tx: Prisma.TransactionClient) {
  if (!items.length) return [] as PricingRateVersion[];
  const now = new Date();
  const scoped = items.map(item => {
    own(actor, item.scope.vendorId);
    if (!!item.scope.origin !== !!item.scope.destination) throw new PricingError("INVALID_INPUT", "Both route endpoints are required", 400);
    return { item, key: scopeKey(item.scope), fare: money(nonnegative(item.fare, "Your Fare")) };
  });
  const keys = scoped.map(x => x.key);
  if (new Set(keys).size !== keys.length) throw new PricingError("INVALID_INPUT", "A price is listed more than once", 400);
  await lockMany(tx, keys);
  const existing = await tx.pricingRateVersion.findMany({ where: { scopeKey: { in: keys } }, select: { id: true, scopeKey: true, version: true, status: true, effectiveFrom: true, effectiveTo: true } });
  const policies = await tx.pricingPolicy.findMany({ where: { active: true } });
  const latest = new Map<string, number>();
  for (const row of existing) latest.set(row.scopeKey, Math.max(latest.get(row.scopeKey) || 0, row.version));
  const closing: { key: string; old: (typeof existing)[number] }[] = [];
  const data = scoped.map(({ item, key, fare }) => {
    const s = item.scope, previous = latest.get(key) || 0;
    if (item.expectedVersion !== undefined && item.expectedVersion !== previous) throw new PricingError("VERSION_CONFLICT", "The rate changed. Reload before saving.");
    const master = selectPolicy(policies, "MASTER", s, from, false);
    const bandPolicy = selectPolicy(policies, "BAND", s, from, false);
    const band = bandPolicy ? policyData("BAND", bandPolicy.data) as Band : null;
    const reasonRequired = (reason: string) => (!band || !inBand(fare, band)) && (!actor.admin || !reason.trim());
    // submit: DRAFT → PENDING, or APPROVED inside the auto-approval band (no reason given).
    let status = band && inBand(fare, band, true) ? "APPROVED" : "PENDING", reason = "", adminApproved = false;
    if (status === "APPROVED" && reasonRequired("")) throw new PricingError("APPROVAL_REASON_REQUIRED", "Outside-band approval requires Super Admin and a reason");
    // Super Admin approval of a pending price, with the stated reason.
    if (status === "PENDING" && actor.admin) {
      if (reasonRequired(approveReason)) throw new PricingError("APPROVAL_REASON_REQUIRED", "Outside-band approval requires Super Admin and a reason");
      status = "APPROVED"; reason = approveReason; adminApproved = true;
    }
    if (status === "APPROVED") for (const old of existing) {
      if (old.scopeKey !== key || old.status !== "APPROVED" || (old.effectiveTo && old.effectiveTo <= from)) continue;
      if (old.effectiveFrom >= from || from < now) throw new PricingError("OVERLAPPING_RATE", "Choose a future Effective From after the current version");
      closing.push({ key, old });
    }
    return { adminApproved, row: { pricingRuleId: item.pricingRuleId, pricingPackageId: s.pricingPackageId || null, scopeKey: key, vendorId: s.vendorId, vehicleCategory: s.vehicleCategory as VehicleCategory, service: s.service,
      city: s.city || "", origin: s.origin || "", destination: s.destination || "", area: s.area || "", version: previous + 1, effectiveFrom: from, effectiveTo: null, fare, smartReturnFare: null, status,
      terms: json({ ...(master ? object(master.data) : {}), ...item.terms, ...(master ? { masterPolicyId: master.id, masterPolicyVersion: master.version } : {}) }), createdBy: actor.id,
      ...(status === "APPROVED" ? { reviewedBy: actor.id, reviewedAt: now, reviewReason: reason || "Within auto-approval band" } : {}) } satisfies Prisma.PricingRateVersionCreateManyInput };
  });
  // A replacement closes its predecessor at the future boundary (before insert, so the
  // database overlap guard holds); past quotes are never rewritten.
  if (closing.length) await tx.pricingRateVersion.updateMany({ where: { id: { in: closing.map(c => c.old.id) } }, data: { effectiveTo: from } });
  const created = await tx.pricingRateVersion.createManyAndReturn({ data: data.map(d => d.row) });
  const byKey = new Map(created.map(row => [row.scopeKey, row]));
  const audit: Prisma.AuditLogCreateManyInput[] = closing.map(c => auditRow(actor, c.old.id, c.old, { effectiveTo: from, replacedBy: byKey.get(c.key)!.id }));
  data.forEach((d, i) => {
    const row = byKey.get(scoped[i].key)!, draft = { ...row, status: "DRAFT", reviewedBy: null, reviewedAt: null, reviewReason: null };
    audit.push(auditRow(actor, row.id, null, draft));
    if (d.adminApproved) { const pending = { ...draft, status: "PENDING" }; audit.push(auditRow(actor, row.id, draft, pending), auditRow(actor, row.id, pending, row)); }
    else audit.push(auditRow(actor, row.id, draft, row));
  });
  await tx.auditLog.createMany({ data: audit });
  return created;
}

export async function deactivateRatesBatch(actor: Actor, ids: string[], tx: Prisma.TransactionClient) {
  if (!ids.length) return 0;
  const found = await tx.pricingRateVersion.findMany({ where: { id: { in: ids } }, select: { vendorId: true, scopeKey: true } });
  for (const row of found) own(actor, row.vendorId);
  await lockMany(tx, found.map(row => row.scopeKey));
  const rows = await tx.pricingRateVersion.findMany({ where: { id: { in: ids }, status: { in: ["APPROVED", "PENDING", "DRAFT"] } } });
  if (!rows.length) return 0;
  const deactivatedAt = new Date();
  await tx.pricingRateVersion.updateMany({ where: { id: { in: rows.map(row => row.id) } }, data: { status: "INACTIVE", deactivatedAt } });
  await tx.auditLog.createMany({ data: rows.map(row => auditRow(actor, row.id, row, { ...row, status: "INACTIVE", deactivatedAt })) });
  return rows.length;
}
