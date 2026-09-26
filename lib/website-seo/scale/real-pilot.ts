import { isDeepStrictEqual } from "node:util";
import { ConfigurationScope, SystemSettingType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadRealCandidates } from "../entities/real-sync";
import { createDefaultWebsiteTemplateDefinition } from "../templates/defaults";
import { dryRun } from "./candidates";
import { createPlan, importCandidates } from "./service";

export class RealPilotError extends Error {}

export async function prepareRealPilot(actor: string) {
  const key = "website-seo.real-pilot-10";
  const saved = await prisma.systemSetting.findUnique({ where: { settingKey: key } });
  if (saved) return { ...JSON.parse(saved.settingValue), existing: true };
  const candidates = (await loadRealCandidates()).candidates.filter(c => c.type === "ROUTE").slice(0,10);
  if (!candidates.length) throw new RealPilotError("No real route candidates are available.");
  const active = await prisma.websiteSeoTemplate.count({ where: { entityType: "ROUTE", status: "ACTIVE" } });
  if (!active) {
    const definition = createDefaultWebsiteTemplateDefinition("ROUTE");
    const template = await prisma.websiteSeoTemplate.findUnique({ where: { key: definition.key! } });
    const metadata = template?.metadata as Record<string, unknown> | null;
    if (!template || template.status !== "DRAFT" || metadata?.systemDefault !== true || template.pathPattern !== definition.pathPattern || !isDeepStrictEqual(template.sections, definition.sections)) throw new RealPilotError("Review and activate a route template in Website Templates before preparing Pilot 10.");
    // Only an unchanged system default is eligible. Never overwrite editorial templates.
    await prisma.websiteSeoTemplate.updateMany({ where: { id: template.id, status: "DRAFT", updatedAt: template.updatedAt }, data: { status: "ACTIVE" } });
  }
  const inspection = await dryRun(candidates);
  if (inspection.some(i => !i.eligible)) throw new RealPilotError("Resolve Pilot 10 template or keyword conflicts in Scale Control first.");
  // A DRAFT plan can be reviewed safely. This method never executes generation,
  // selects items for execution, calls providers, or publishes content.
  const name = "Real RideGrid Pilot 10";
  const existing = await prisma.websiteSeoScaleRun.findFirst({ where: { name, rolloutLevel: "PILOT_10", entityType: "ROUTE" }, orderBy: { createdAt: "asc" } });
  const run = existing ?? await createPlan({ name, entityType: "ROUTE", rolloutLevel: "PILOT_10", batchSize: 10 });
  const count = await prisma.websiteSeoScaleItem.count({ where: { runId: run.id } });
  if (!count) await importCandidates(run.id, candidates);
  const result = { runId: run.id, count: count || candidates.length, status: run.status, executed: false, published: false, actor, preparedAt: new Date().toISOString() };
  await prisma.systemSetting.upsert({ where: { settingKey: key }, create: { settingKey: key, settingValue: JSON.stringify(result), settingType: SystemSettingType.JSON, scope: ConfigurationScope.GLOBAL }, update: { settingValue: JSON.stringify(result) } });
  return result;
}
