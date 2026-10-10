import { normalizeWebsiteEntityInput } from "../entities/factory";
import { isWebsiteEntityType } from "../entities/validation";
import type { WebsiteEntityType } from "../entities/types";
import { FACTORY_BATCH_LIMIT } from "../page-factory/config";

export const HARD_LIMIT = 5000;
export const IMPORT_LIMIT = 100;
export const ROLLOUTS = { PILOT_10: 10, GROWTH_100: 100, SCALE_1000: 1000, CUSTOM: HARD_LIMIT } as const;
export type Candidate = { type: WebsiteEntityType; name: string; slug: string; metadata: Record<string, unknown> | null };
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object.");
  return value as Record<string, unknown>;
}
export function planInput(value: unknown) {
  const v = object(value);
  if (typeof v.name !== "string" || !v.name.trim() || v.name.length > 120) throw new Error("Plan name must be 1–120 characters.");
  if (!isWebsiteEntityType(v.entityType)) throw new Error("Unsupported entity type.");
  if (typeof v.rolloutLevel !== "string" || !Object.hasOwn(ROLLOUTS, v.rolloutLevel)) throw new Error("Invalid rollout level.");
  const rolloutLevel = v.rolloutLevel as keyof typeof ROLLOUTS;
  const itemLimit = rolloutLevel === "CUSTOM" ? v.itemLimit : ROLLOUTS[rolloutLevel];
  if (typeof itemLimit !== "number" || !Number.isInteger(itemLimit) || itemLimit < 1 || itemLimit > HARD_LIMIT) throw new Error("Plan limit must be 1–5000.");
  if (typeof v.batchSize !== "number" || !Number.isInteger(v.batchSize) || v.batchSize < 1 || v.batchSize > FACTORY_BATCH_LIMIT) throw new Error("Batch size must be 1–25.");
  return { name: v.name.trim(), entityType: v.entityType, rolloutLevel, itemLimit, batchSize: v.batchSize };
}
export function candidateInput(value: unknown): Candidate {
  const v = object(value);
  if (!isWebsiteEntityType(v.type) || typeof v.name !== "string" || v.name.length > 200 || typeof v.slug !== "string" || !v.slug.trim() || v.slug.length > 200) throw new Error("Type, name and slug are required (maximum 200 characters).");
  if (/[\\/?#%]/.test(v.slug)) throw new Error("Supply a slug, not a path or URL.");
  const metadata = v.metadata == null ? null : object(v.metadata);
  if (JSON.stringify(metadata).length > 16000) throw new Error("Metadata exceeds 16 KB.");
  const n = normalizeWebsiteEntityInput({ type: v.type, name: v.name, slug: v.slug, metadata });
  return { type: n.type, name: n.name, slug: n.slug, metadata };
}
export const candidateKey = (c: Candidate) => `${c.type}:${c.slug}`;
export function duplicateKeys(candidates: Candidate[]) {
  const seen = new Set<string>(), duplicates = new Set<string>();
  for (const c of candidates) { const key = candidateKey(c); if (seen.has(key)) duplicates.add(key); seen.add(key); }
  return duplicates;
}
export function classify(existing: { name: string } | null, candidate: Candidate, conflict: boolean) {
  if (conflict || existing && existing.name.trim().normalize("NFKC").toLowerCase() !== candidate.name.trim().normalize("NFKC").toLowerCase()) return "CONFLICT" as const;
  return existing ? "EXISTS" as const : "NEW" as const;
}
export function progress(total: number, completed: number, blocked: number, failed: number) {
  const processed = completed + blocked + failed;
  return { total, processed, completed, blocked, failed, percent: total ? Math.min(100, Math.round(processed / total * 100)) : 0 };
}
export function transition(status: string, action: string) {
  if (action === "pause" && ["READY", "RUNNING"].includes(status)) return "PAUSED";
  if (action === "resume" && status === "PAUSED") return "READY";
  throw new Error("Invalid run transition.");
}
// RFC-style quoted fields, including escaped quotes/newlines; no dependency.
export function parseImport(text: string): unknown[] {
  if (text.length > 1_000_000) throw new Error("Import exceeds 1 MB.");
  if (text.trim().startsWith("[")) {
    const rows: unknown = JSON.parse(text);
    if (!Array.isArray(rows) || !rows.length || rows.length > IMPORT_LIMIT) throw new Error("Import 1–100 candidates at a time.");
    return rows;
  }
  const rows: string[][] = []; let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if ((c === "," || c === "\n" || c === undefined) && !quoted) {
      row.push(field.trim()); field = "";
      if (c !== ",") { if (row.some(Boolean)) rows.push(row); row = []; }
    } else if (c !== undefined) field += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  const headers = rows.shift()?.map(h => h.toLowerCase()) ?? [];
  if (!["type", "name", "slug"].every(h => headers.includes(h)) || new Set(headers).size !== headers.length || headers.some(h => !["type", "name", "slug", "metadata"].includes(h))) throw new Error("CSV headers: type,name,slug,metadata (optional JSON object).");
  if (!rows.length || rows.length > IMPORT_LIMIT) throw new Error("Import 1–100 candidates at a time.");
  return rows.map(r => { if (r.length !== headers.length) throw new Error("CSV column count mismatch."); const v = Object.fromEntries(headers.map((h, i) => [h, r[i]])); return { ...v, metadata: v.metadata ? JSON.parse(v.metadata) : null }; });
}
