export interface ScalePipeline {
  entity(): Promise<string>;
  page(entityId: string): Promise<string>;
  keywords(entityId: string): Promise<boolean>;
  content(entityId: string, pageId: string): Promise<boolean>;
  seo(entityId: string, pageId: string): Promise<boolean>;
  readiness(entityId: string, pageId: string): Promise<{ ready: boolean; reasons: string[] }>;
}
export async function runPipeline(p: ScalePipeline, checkpoint: () => Promise<void> = async () => {}) {
  await checkpoint(); const entityId = await p.entity();
  await checkpoint(); const pageId = await p.page(entityId);
  await checkpoint(); if (!await p.keywords(entityId)) return { status: "BLOCKED", error: "W4 keyword mapping requires review." };
  await checkpoint(); if (!await p.content(entityId, pageId)) return { status: "BLOCKED", error: "W5 content quality/persistence requires review." };
  await checkpoint(); if (!await p.seo(entityId, pageId)) return { status: "BLOCKED", error: "W6 SEO quality/persistence requires review." };
  await checkpoint(); const readiness = await p.readiness(entityId, pageId);
  return { status: readiness.ready ? "COMPLETED" : "BLOCKED", error: readiness.ready ? null : readiness.reasons.join(" ") };
}
export async function isolated<T>(items: T[], execute: (item: T) => Promise<void>, failed: (item: T, error: unknown) => Promise<void>) {
  for (const item of items) { try { await execute(item); } catch (error) { await failed(item, error); } }
}
