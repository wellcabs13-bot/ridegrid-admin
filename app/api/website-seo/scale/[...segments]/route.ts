import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { object, parseImport } from "@/lib/website-seo/scale/logic";
import { dryRun } from "@/lib/website-seo/scale/candidates";
import { controlRun, createPlan, executeRun, existingCandidates, importCandidates, importExisting, inspectSaved, runDetail, selectCandidates } from "@/lib/website-seo/scale/service";
import { overview, quality } from "@/lib/website-seo/scale/reporting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ segments: string[] }> };
const ok = (data: unknown) => Response.json({ ok: true, data });
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientUnknownRequestError || error instanceof Prisma.PrismaClientValidationError) {
    console.error("[W15 storage failure]", error);
    return Response.json({ ok: false, error: "Scale storage is unavailable. Check server configuration and migration status." }, { status: 503 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const message = error.code === "P2021" ? "W15 migration is not installed. Apply the reviewed migration separately before using scale persistence." : error.code === "P2002" ? "Duplicate candidate or another scale worker is active. Refresh and retry after review." : "Scale storage operation failed. Refresh before retrying.";
    return Response.json({ ok: false, error: message }, { status: 409 });
  }
  return Response.json({ ok: false, error: error instanceof Error ? error.message : "Scale request failed." }, { status: 400 });
}
export async function GET(request: Request, context: Context) {
  try {
    const { segments: s } = await context.params;
    const url = new URL(request.url), cursor = url.searchParams.get("cursor") || undefined;
    if (cursor && cursor.length > 200) throw new Error("Invalid cursor.");
    if (s.length === 1 && s[0] === "overview") return ok(await overview());
    if (s.length === 1 && s[0] === "quality") return ok(await quality(cursor));
    if (s.length === 1 && s[0] === "candidates") return ok(await existingCandidates(url.searchParams.get("type"), cursor));
    if (s.length === 1 && s[0] === "runs") {
      const rows = await prisma.websiteSeoScaleRun.findMany({ where: cursor ? { id: { lt: cursor } } : {}, orderBy: { id: "desc" }, take: 21, select: { id: true, name: true, entityType: true, status: true, rolloutLevel: true, createdAt: true, _count: { select: { items: true } } } });
      return ok({ items: rows.slice(0, 20), nextCursor: rows.length > 20 ? rows[19].id : null });
    }
    if (s.length === 2 && s[0] === "runs") return ok(await runDetail(s[1], cursor, url.searchParams.get("status") || undefined));
    return Response.json({ ok: false, error: "Unknown scale endpoint." }, { status: 404 });
  } catch (e) { return failure(e); }
}
export async function POST(request: Request, context: Context) {
  try {
    // Same-origin mutation boundary, alongside existing Website SEO middleware auth.
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return Response.json({ ok: false, error: "Cross-origin request rejected." }, { status: 403 });
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Request body required.");
    const decoder = new TextDecoder(); let text = "", bytes = 0;
    for (;;) { const r = await reader.read(); if (r.done) break; bytes += r.value.byteLength; if (bytes > 1_100_000) { await reader.cancel(); throw new Error("Request exceeds 1 MB."); } text += decoder.decode(r.value, { stream: true }); }
    text += decoder.decode();
    const b = object(JSON.parse(text)); const { segments: s } = await context.params;
    if (s.length === 1 && s[0] === "plan") return ok(await createPlan(b));
    if (s.length === 1 && s[0] === "candidates") {
      const runId = typeof b.runId === "string" ? b.runId : undefined;
      if (b.action === "inspectSaved" && runId) return ok(await inspectSaved(runId, b.ids));
      if (b.action === "existing" && runId) return ok(await importExisting(runId, b.ids));
      const values = typeof b.text === "string" ? parseImport(b.text) : b.candidates;
      if (!Array.isArray(values)) throw new Error("Provide candidate JSON array or CSV text.");
      if (b.action === "dryRun") return ok(await dryRun(values, runId));
      if (b.action === "import" && runId) return ok(await importCandidates(runId, values));
    }
    if (s.length === 3 && s[0] === "runs" && s[2] === "execute") return ok(await executeRun(s[1]));
    if (s.length === 2 && s[0] === "runs") {
      if (b.action === "select" && Array.isArray(b.ids) && typeof b.selected === "boolean") return ok(await selectCandidates(s[1], b.ids, b.selected));
      if (typeof b.action === "string") { await controlRun(s[1], b.action); return ok(await runDetail(s[1])); }
    }
    throw new Error("Unknown scale operation.");
  } catch (e) { return failure(e); }
}
