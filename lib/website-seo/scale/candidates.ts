import { prisma } from "@/lib/prisma";
import { resolveWebsitePagePath } from "../templates";
import { normalizeSeoPath } from "../seo/canonical";
import { isPublicationPath } from "../publishing/readiness";
import { analyzeKeywords } from "../keywords/engine/analyze";
import { candidateInput, candidateKey, classify, duplicateKeys, IMPORT_LIMIT, type Candidate } from "./logic";

export type Inspection = {
  candidate: Candidate | null; key: string; classification: "NEW" | "EXISTS" | "CONFLICT" | "INVALID";
  templateId: string | null; entityId: string | null; pageId: string | null; path: string | null;
  cannibalization: "CLEAR" | "REVIEW" | "CONFLICT"; eligible: boolean; reasons: string[];
};

// Read-only by construction: no engine generate/persist or repository write calls.
export async function dryRun(values: unknown[], runId?: string, saved = false): Promise<Inspection[]> {
  if (!values.length || values.length > IMPORT_LIMIT) throw new Error("Inspect 1–100 candidates at a time.");
  const normalized = values.map(v => { try { return candidateInput(v); } catch { return null; } });
  const valid = normalized.filter((c): c is Candidate => c !== null);
  const duplicates = duplicateKeys(valid);
  const templates = (await Promise.all([...new Set(valid.map(c => c.type))].map(entityType => prisma.websiteSeoTemplate.findMany({ where: { status: "ACTIVE", entityType }, select: { id: true, key: true, entityType: true, pathPattern: true }, orderBy: { id: "asc" }, take: 2 })))).flat();
  const entities = valid.length ? await prisma.websiteSeoEntity.findMany({ where: { OR: valid.map(c => ({ type: c.type, slug: c.slug })) }, take: IMPORT_LIMIT }) : [];
  const planDuplicates = runId && !saved ? await prisma.websiteSeoScaleItem.findMany({ where: { runId, candidateKey: { in: valid.map(candidateKey) } }, select: { candidateKey: true }, take: IMPORT_LIMIT }) : [];
  const analyses = valid.map(c => {
    const e = entities.find(e => e.type === c.type && e.slug === c.slug);
    return { key: candidateKey(c), keywords: analyzeKeywords(e ?? { ...c, id: candidateKey(c) }).keywords.filter(k => k.type === "PRIMARY") };
  });
  const primaryWords = [...new Set(analyses.flatMap(a => a.keywords.map(k => k.normalizedKeyword)))];
  // Compare across earlier import/selection batches too, without materializing the plan.
  const planOverlaps = new Set<string>();
  const planPaths = new Map<string, Set<string>>();
  if (runId) {
    let cursor: string | undefined;
    for (;;) {
      const rows = await prisma.websiteSeoScaleItem.findMany({ where: { runId, ...(cursor ? { id: { gt: cursor } } : {}) }, orderBy: { id: "asc" }, take: 100 });
      for (const row of rows) {
        const matching = templates.filter(t => t.entityType === row.entityType);
        if (matching.length === 1) {
          try { const path = normalizeSeoPath(resolveWebsitePagePath(matching[0], row.slug).pathname); if (path) planPaths.set(path, new Set([...(planPaths.get(path) ?? []), row.candidateKey])); } catch { /* Invalid paths are blocked below. */ }
        }
        const primary = analyzeKeywords({ id: row.entityId ?? row.candidateKey, type: row.entityType, name: row.name, metadata: row.metadata }).keywords.filter(k => k.type === "PRIMARY");
        for (const a of analyses) if (a.key !== row.candidateKey && a.keywords.some(k => primary.some(p => p.normalizedKeyword === k.normalizedKeyword && p.intent === k.intent))) planOverlaps.add(a.key);
      }
      if (rows.length < 100) break;
      cursor = rows[rows.length - 1].id;
    }
  }
  const results: Inspection[] = [];
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (!c) { let reason = "Invalid input."; try { candidateInput(values[i]); } catch (e) { reason = e instanceof Error ? e.message : reason; } results.push({ candidate: null, key: `invalid-${i}`, classification: "INVALID", templateId: null, entityId: null, pageId: null, path: null, cannibalization: "REVIEW", eligible: false, reasons: [reason] }); continue; }
    const key = candidateKey(c), reasons: string[] = [];
    const entity = entities.find(e => e.type === c.type && e.slug === c.slug) ?? null;
    const available = templates.filter(t => t.entityType === c.type);
    const template = available.length === 1 ? available[0] : null;
    if (!template) reasons.push(available.length ? "Multiple ACTIVE templates: resolve template ambiguity in Page Factory." : "No ACTIVE template.");
    let path: string | null = null;
    try { if (template) path = normalizeSeoPath(resolveWebsitePagePath(template, c.slug).pathname); } catch { /* Invalid template paths fail closed. */ }
    if (!path || !isPublicationPath(path)) reasons.push("No safe supported public path.");
    const pages = await prisma.websiteSeoPage.findMany({ where: { OR: [...(entity ? [{ entityId: entity.id }] : []), ...(path ? [{ pathname: { in: [path, `${path}/`] } }, { metadata: { path: ["seoW6", "plan", "canonical", "path"], equals: path } }] : [])] }, select: { id: true, entityId: true, templateId: true, pathname: true, status: true }, take: 3 });
    let conflict = duplicates.has(key) || planDuplicates.some(p => p.candidateKey === key);
    if (conflict) reasons.push("Duplicate normalized candidate in plan/import.");
    if (path && [...(planPaths.get(path) ?? [])].some(k => k !== key)) { conflict = true; reasons.push("Canonical target conflicts with another plan candidate."); }
    if (pages.some(p => p.entityId !== entity?.id || p.pathname !== path || p.templateId !== template?.id) || pages.length > 1) { conflict = true; reasons.push("Existing page, canonical target or entity mapping conflicts."); }
    if (entity && ["ARCHIVED", "INACTIVE"].includes(entity.status)) reasons.push("Entity is inactive or archived.");
    if (pages.some(p => p.status === "ARCHIVED")) reasons.push("Existing page is archived.");
    const classification = classify(entity, c, conflict);
    if (classification === "CONFLICT" && !reasons.length) reasons.push("Slug belongs to a differently named entity.");
    const analysis = analyses.find(a => a.key === key)!;
    let cannibalization: Inspection["cannibalization"] = analysis.keywords.length ? "CLEAR" : "REVIEW";
    const overlaps = analyses.some(a => a.key !== key && a.keywords.some(k => analysis.keywords.some(p => p.normalizedKeyword === k.normalizedKeyword && p.intent === k.intent)));
    // Existence queries stay bounded even when a keyword is mapped to a large inventory.
    const mappedConflict = primaryWords.length && await prisma.websiteSeoKeyword.findFirst({ where: {
      type: "PRIMARY", status: { notIn: ["REJECTED", "ARCHIVED"] }, entityId: { not: entity?.id ?? "" },
      OR: analysis.keywords.map(k => ({ normalizedKeyword: k.normalizedKeyword, intent: k.intent })),
    }, select: { id: true } });
    if (overlaps || mappedConflict || planOverlaps.has(key)) cannibalization = "CONFLICT";
    if (cannibalization !== "CLEAR") reasons.push("Primary keyword/intent requires mapping review in W4.");
    results.push({ candidate: c, key, classification, templateId: template?.id ?? null, entityId: entity?.id ?? null, pageId: pages[0]?.id ?? null, path, cannibalization, eligible: classification !== "CONFLICT" && reasons.length === 0, reasons });
  }
  const paths = new Map<string, Inspection[]>();
  for (const r of results) if (r.path) paths.set(r.path, [...(paths.get(r.path) ?? []), r]);
  for (const group of paths.values()) if (group.length > 1) for (const r of group) { r.classification = "CONFLICT"; r.eligible = false; r.reasons.push("Duplicate canonical target inside import."); }
  return results;
}
