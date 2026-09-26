import { isDeepStrictEqual } from "node:util";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, ConfigurationScope, SystemSettingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GET as marketplaceOptions } from "@/app/api/marketplace/options/route";
import { JOURNEYS, type PricingOption } from "@/lib/website-public/marketplace";
import { createWebsiteEntitySlug } from "./slug";
import { WEBSITE_ENTITY_TYPES, type WebsiteEntityType } from "./types";
export interface RealCandidate { type: WebsiteEntityType; name: string; slug: string; sourceId: string; metadata: Record<string, unknown> }
const clean = (value: string | null | undefined) => (value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
export function realEntityCandidates(options: PricingOption[], availableCategories: string[]) {
  const rows = new Map<string, { type: WebsiteEntityType; name: string; metadata: Record<string, unknown>; sources: Set<string> }>();
  let skipped = 0;
  function add(type: WebsiteEntityType, name: string, source: string, metadata: Record<string, unknown>) {
    name = clean(name); const slug = createWebsiteEntitySlug(name);
    if (!name || !slug || name.length > 200) { skipped++; return; }
    const key = `${type}:${slug}`;
    const existing = rows.get(key);
    if (existing) existing.sources.add(source);
    else rows.set(key, { type, name, metadata, sources: new Set([source]) });
  }
  for (const o of [...options].sort((a,b) => a.id.localeCompare(b.id))) {
    if (!o.id || !JOURNEYS.some(j => j.service === o.pricingType && (j.service !== "OUTSTATION" || j.trip === o.tripType))) { skipped++; continue; }
    const from = clean(o.fromCity), to = clean(o.toCity), city = clean(o.city);
    if (o.pricingType === "OUTSTATION") {
      if (!from || !to || from.toLowerCase() === to.toLowerCase()) { skipped++; continue; }
      add("CITY", from, o.id, { city: from }); add("CITY", to, o.id, { city: to });
      add("ROUTE", `${from} to ${to}`, o.id, { fromCity: from, toCity: to, origin: from, destination: to });
    } else if (city) add("CITY", city, o.id, { city });
    const journey = JOURNEYS.find(j => j.service === o.pricingType && (j.service !== "OUTSTATION" || j.trip === o.tripType))!;
    add("SERVICE", `${journey.label} Cab Travel`, o.id, { service: o.pricingType, tripType: o.tripType });
    if (o.pricingType === "AIRPORT" && clean(o.airportName) && city) add("AIRPORT", clean(o.airportName), o.id, { airport: clean(o.airportName), city });
    if (availableCategories.includes(o.vehicleCategory)) add("VEHICLE", `${clean(o.vehicleCategory).replace(/_/g," ")} Travel`, o.id, { vehicle: o.vehicleCategory, category: o.vehicleCategory });
  }
  const candidates: RealCandidate[] = [...rows.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([key,row]) => {
    const sources = [...row.sources].sort();
    return { type: row.type, name: row.name, slug: key.slice(key.indexOf(":") + 1), sourceId: `ridegrid-real:${key}`,
      metadata: { ...row.metadata, realSource: { engine: "RIDEGRID_REAL_SYNC_V1", source: "Active PricingPackage + PricingRule / marketplace options", packageIds: sources.slice(0,100), sourceCount: sources.length, fingerprint: createHash("sha256").update(sources.join("|")).digest("hex") } } };
  });
  return { candidates, skipped, notes: ["AREA: no reliable persisted locality source; no area entities created.", "VEHICLE: available, non-deleted vehicle categories intersected with live pricing options.", "No geocoder suggestions, private vehicle identifiers, ratings or fares are imported."] };
}
export async function loadRealCandidates() {
  const response = await marketplaceOptions();
  const payload = await response.json();
  if (!response.ok || !payload.success || !Array.isArray(payload.data)) throw new Error("Live marketplace options are unavailable. Nothing was synced.");
  const vehicles = await prisma.vehicle.findMany({ where: { deletedAt: null, status: "AVAILABLE" }, select: { category: true }, distinct: ["category"] });
  return realEntityCandidates(payload.data, vehicles.map(v => v.category));
}
export async function syncRealEntities({ dryRun = true, offset = 0, actor = "website-seo-sync" }: { dryRun?: boolean; offset?: number; actor?: string } = {}) {
  if (!Number.isInteger(offset) || offset < 0) throw new Error("Invalid sync cursor.");
  const source = await loadRealCandidates(), batch = source.candidates.slice(offset, offset + 100);
  const report = { id: randomUUID(), dryRun, offset, nextOffset: offset + batch.length < source.candidates.length ? offset + batch.length : null,
    sourceTotal: source.candidates.length, created: 0, updated: 0, unchanged: 0, skipped: source.skipped, errors: [] as string[], notes: source.notes,
    families: Object.fromEntries(WEBSITE_ENTITY_TYPES.map(type => [type, source.candidates.filter(c => c.type === type).length])), at: new Date().toISOString() };
  // Per-entity transactions keep locks short. Unique type/slug plus serializable
  // retries make reruns safe without overwriting editorial records or statuses.
  for (const candidate of batch) {
    for (let attempt = 0; ; attempt++) {
      try {
        const operation = async (db: Prisma.TransactionClient) => {
          const existing = await db.websiteSeoEntity.findUnique({ where: { type_slug: { type: candidate.type, slug: candidate.slug } } });
          if (existing && existing.sourceId !== candidate.sourceId) return "skipped" as const;
          if (!existing) { if (!dryRun) await db.websiteSeoEntity.create({ data: { ...candidate, metadata: candidate.metadata as Prisma.InputJsonValue, status: "DRAFT" } }); return "created" as const; }
          const old = existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata) ? existing.metadata as Record<string, unknown> : {};
          if (isDeepStrictEqual(old.realSource, candidate.metadata.realSource)) return "unchanged" as const;
          if (!dryRun) await db.websiteSeoEntity.update({ where: { id: existing.id }, data: { metadata: { ...old, realSource: candidate.metadata.realSource } as Prisma.InputJsonValue } });
          return "updated" as const;
        };
        const result = dryRun ? await operation(prisma) : await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        report[result]++; break;
      } catch (error) {
        if (attempt < 2 && error instanceof Prisma.PrismaClientKnownRequestError && ["P2034","P2002"].includes(error.code)) continue;
        report.errors.push(`${candidate.type}/${candidate.slug}: sync failed; rerun is safe.`); break;
      }
    }
  }
  if (!dryRun) await prisma.systemSetting.create({ data: { settingKey: `website-seo.real-sync.${report.id}`, settingValue: JSON.stringify({ ...report, actor }), settingType: SystemSettingType.JSON, scope: ConfigurationScope.GLOBAL, description: "Real entity sync audit; no pages published." } });
  return report;
}
