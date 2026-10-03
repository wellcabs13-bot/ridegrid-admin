import { COMPETITOR_STATUSES, OBSERVATION_KINDS, OBSERVATION_SUBJECTS, type CompetitorInput, type ObservationInput } from "./types";

export class SearchIntelligenceInputError extends Error {}
function fail(message: string): never { throw new SearchIntelligenceInputError(message); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("Expected an object.");
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key))) fail("Unsupported input field.");
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\u0000-\u001f]/.test(value)) fail(`${label} must be non-empty text (maximum ${max} characters).`);
  return value.trim();
}
function optionalText(value: unknown, label: string, max: number) { return value == null ? null : text(value, label, max); }
function choice<T extends string>(value: unknown, options: readonly T[], label: string): T {
  return options.find((item) => item === value) ?? fail(`Invalid ${label}.`);
}
export function normalizeCompetitorDomain(value: unknown): string {
  const raw = text(value, "Domain", 2048);
  if (/\s|\\/.test(raw)) fail("Invalid domain.");
  let parsed: URL;
  try { parsed = new URL(raw.includes("://") ? raw : `https://${raw}`); } catch { return fail("Invalid domain."); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) fail("Use a public hostname without credentials or a port.");
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  if (host.length > 253 || !host.includes(".") || /^[\d.]+$/.test(host) || host.split(".").some((part) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(part))) fail("Invalid public hostname.");
  return host;
}
export function safeObservationUrl(value: unknown): string | null {
  if (value == null) return null;
  const raw = text(value, "URL", 2048);
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return fail("Use an absolute HTTP or HTTPS URL."); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) fail("Use an HTTP or HTTPS URL without credentials.");
  return parsed.href;
}
export function validateCompetitor(value: unknown, partial = false): Partial<CompetitorInput> {
  const input = object(value); keys(input, ["name", "domain", "status", "notes"]);
  if (!Object.keys(input).length) fail("Supply competitor fields.");
  const output: Partial<CompetitorInput> = {};
  if (!partial || input.name !== undefined) output.name = text(input.name, "Name", 200);
  if (!partial || input.domain !== undefined) output.domain = normalizeCompetitorDomain(input.domain);
  if (!partial || input.status !== undefined) output.status = choice(input.status === undefined ? "ACTIVE" : input.status, COMPETITOR_STATUSES, "competitor status");
  if (!partial || input.notes !== undefined) {
    if (input.notes != null && (typeof input.notes !== "string" || input.notes.length > 4000)) fail("Notes must be text of at most 4000 characters.");
    output.notes = typeof input.notes === "string" ? input.notes.trim() || null : null;
  }
  return output;
}
export function validateObservation(value: unknown): ObservationInput {
  const input = object(value);
  keys(input, ["kind", "subject", "provider", "query", "keywordId", "pageId", "competitorId", "url", "rank", "visibilityScore", "mentioned", "cited", "observedAt", "metadata"]);
  const kind = choice(input.kind, OBSERVATION_KINDS, "observation kind");
  const subject = choice(input.subject, OBSERVATION_SUBJECTS, "subject");
  const competitorId = optionalText(input.competitorId, "Competitor ID", 200);
  if (subject === "COMPETITOR" && !competitorId) fail("A competitor subject requires competitorId.");
  if (subject === "OWN_SITE" && competitorId) fail("Own-site observations cannot identify a competitor.");
  const rank = input.rank ?? null;
  if (rank !== null && (typeof rank !== "number" || !Number.isInteger(rank) || rank < 1 || rank > 2147483647)) fail("Rank must be an integer >= 1.");
  const visibilityScore = input.visibilityScore ?? null;
  if (visibilityScore !== null && (typeof visibilityScore !== "number" || !Number.isFinite(visibilityScore) || visibilityScore < 0 || visibilityScore > 100)) fail("Visibility score must be 0–100.");
  const mentioned = input.mentioned ?? null; const cited = input.cited ?? null;
  if ((mentioned !== null && typeof mentioned !== "boolean") || (cited !== null && typeof cited !== "boolean")) fail("Mentioned and cited must be boolean or null.");
  if (kind === "ORGANIC_RANKING" && (visibilityScore !== null || mentioned !== null || cited !== null)) fail("Organic observations cannot contain AI visibility fields.");
  if (kind === "AI_VISIBILITY" && rank !== null) fail("AI visibility observations cannot contain an organic rank.");
  const timestamp = text(input.observedAt, "Observed time", 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) || !Number.isFinite(Date.parse(timestamp))) fail("Observed time must be an ISO timestamp with timezone.");
  const [year, month, day] = timestamp.slice(0, 10).split("-").map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || Number(timestamp.slice(11, 13)) > 23) fail("Observed time contains an invalid calendar date or hour.");
  const observedAt = new Date(timestamp);
  if (observedAt.getTime() > Date.now() + 60000) fail("Observed time cannot be in the future.");
  const meta = input.metadata === undefined ? {} : object(input.metadata);
  keys(meta, ["sourceType", "notes", "evidenceUrl"]);
  const metadata: ObservationInput["metadata"] = { sourceType: choice(meta.sourceType === undefined ? "MANUAL" : meta.sourceType, ["MANUAL", "PROVIDER"], "source type") };
  if (meta.notes !== undefined) metadata.notes = text(meta.notes, "Evidence notes", 2000);
  if (meta.evidenceUrl !== undefined) metadata.evidenceUrl = safeObservationUrl(meta.evidenceUrl) ?? fail("Evidence URL cannot be null.");
  return { kind, subject, competitorId, provider: text(input.provider, "Provider", 120), query: text(input.query, "Query", 500),
    keywordId: optionalText(input.keywordId, "Keyword ID", 200), pageId: optionalText(input.pageId, "Page ID", 200), url: safeObservationUrl(input.url),
    rank: rank as number | null, visibilityScore: visibilityScore as number | null, mentioned: mentioned as boolean | null, cited: cited as boolean | null, observedAt, metadata };
}
