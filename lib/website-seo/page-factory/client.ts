import type { GenerateWebsitePageInput } from "../pages/types";
import type { FactoryEntity, FactoryInventory, FactoryPage, FactoryTemplate, FactoryRun, FactoryStep, StepResult, KeywordResult, ContentResult, SeoResult, ReadinessResult } from "./types";

const ROOT = "/api/website-seo";
export async function factoryApi<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${ROOT}/${path}`, body === undefined ? { cache: "no-store" } : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store",
  });
  let envelope: { success?: boolean; ok?: boolean; error?: string; data?: T };
  try { envelope = await response.json(); }
  catch { throw new Error("The server returned an invalid response. Reload and retry."); }
  // W2/W3 use success; W4–W7 use ok.
  if (!response.ok || !(envelope.success === true || envelope.ok === true) || envelope.data === undefined) {
    throw new Error(envelope.error || `Request failed (${response.status}).`);
  }
  return envelope.data;
}
export async function loadFactoryInventory(): Promise<FactoryInventory> {
  const [entities, pages, templates] = await Promise.all([
    factoryApi<FactoryEntity[]>("entities"), factoryApi<FactoryPage[]>("pages"), factoryApi<FactoryTemplate[]>("templates"),
  ]);
  return { entities, pages, templates };
}
export function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function storedStage(page: FactoryPage | undefined, stage: "contentW5" | "seoW6") {
  const metadata = record(page?.metadata);
  const saved = record(metadata[stage]);
  return saved.engine === (stage === "contentW5" ? "W5" : "W6");
}
export function newFactoryRun(entityId: string): FactoryRun {
  return { entityId, steps: { page: { state: "NOT STARTED" }, keywords: { state: "NOT STARTED" }, content: { state: "NOT STARTED" }, seo: { state: "NOT STARTED" }, readiness: { state: "NOT STARTED" } } };
}

// Existing pages are reused: W3 regeneration overwrites metadata and lifecycle state.
export async function ensureFactoryPage(entityId: string, templateId?: string): Promise<{ page: FactoryPage; reused: boolean }> {
  const entity = await factoryApi<FactoryEntity>(`entities/${encodeURIComponent(entityId)}`);
  const templates = await factoryApi<FactoryTemplate[]>(`templates?entityType=${entity.type}`);
  if (templateId ? !templates.some((t) => t.id === templateId && t.status === "ACTIVE") : !templates.some((t) => t.status === "ACTIVE")) {
    throw new Error("Select an ACTIVE template matching this entity type.");
  }
  const pages = await factoryApi<FactoryPage[]>(`pages?entityId=${encodeURIComponent(entityId)}`);
  const matches = templateId ? pages.filter((p) => p.templateId === templateId) : pages;
  if (matches.length > 1) throw new Error("Multiple pages exist. Select an explicit template in the entity factory.");
  if (matches[0]) {
    if (matches[0].status === "ARCHIVED") throw new Error("This page is archived. Manage its lifecycle in Website Manager.");
    if (matches[0].template.status !== "ACTIVE") throw new Error("The existing page template is not ACTIVE. Select an active template.");
    return { page: matches[0], reused: true };
  }
  const input: GenerateWebsitePageInput = { entityId, ...(templateId ? { templateId } : {}) };
  const result = await factoryApi<{ page: FactoryPage }>("pages/generate", input);
  return { page: result.page, reused: false };
}

export async function generateFactoryPackage(entityId: string, mode: "PAGE" | "PACKAGE", templateId: string | undefined,
  onProgress: (run: FactoryRun) => void): Promise<FactoryRun> {
  let run = newFactoryRun(entityId);
  let current: FactoryStep = "page";
  const step = (key: FactoryStep, result: StepResult) => {
    run = { ...run, steps: { ...run.steps, [key]: result } };
    onProgress(run);
  };
  const blocked = (message: string) => { step(current, { ...run.steps[current], state: "BLOCKED", message }); run = { ...run, error: message }; onProgress(run); return run; };
  try {
    step("page", { state: "RUNNING" });
    const { page, reused } = await ensureFactoryPage(entityId, templateId);
    run = { ...run, page };
    step("page", { state: "COMPLETE", message: `${reused ? "Existing page reused" : "Page generated"}: ${page.pathname}` });
    if (mode === "PAGE") return run;
    current = "keywords";
    step(current, { state: "RUNNING" });
    const keywords = await factoryApi<KeywordResult>("keywords/generate", { entityId, persist: true });
    if (!keywords.persistence || keywords.persistence.records.length === 0) return blocked("No keywords were persisted. Inspect keyword generation before continuing.");
    step(current, { state: "COMPLETE", message: `${keywords.persistence.created} created; ${keywords.persistence.preserved} preserved`, data: keywords });
    current = "content";
    step(current, { state: "RUNNING" });
    const content = await factoryApi<ContentResult>("content/generate", { entityId, pageId: page.id, persist: true });
    if (content.persistence.status === "SKIPPED") { step(current, { state: "BLOCKED", data: content }); return blocked(content.persistence.reason); }
    if (content.persistence.status === "PREVIEW") return blocked("Content was previewed but not persisted.");
    step(current, { state: "COMPLETE", message: content.persistence.status, data: content });
    current = "seo";
    step(current, { state: "RUNNING" });
    const seo = await factoryApi<SeoResult>("seo/generate", { entityId, pageId: page.id, persist: true });
    if (seo.persistence.status === "SKIPPED") { step(current, { state: "BLOCKED", data: seo }); return blocked(seo.persistence.reason); }
    if (seo.persistence.status === "PREVIEW") return blocked("SEO was previewed but not persisted.");
    step(current, { state: "COMPLETE", message: `${seo.persistence.status} · quality ${seo.quality.status}`, data: seo });
    current = "readiness";
    step(current, { state: "RUNNING" });
    const readiness = await factoryApi<ReadinessResult>("publishing/preview", { entityId, pageId: page.id });
    step(current, { state: readiness.readiness.ready ? "COMPLETE" : "BLOCKED", message: readiness.readiness.ready ? "Ready for publishing review" : readiness.readiness.blockingIssues.map((issue) => issue.message).join(" "), data: readiness });
    if (!readiness.readiness.ready) run = { ...run, error: "Readiness is blocked. Review the returned issues." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    step(current, { state: "ERROR", message });
    run = { ...run, error: message };
  }
  onProgress(run);
  return run;
}
