import { NextRequest } from "next/server";
import { websiteSeoEngine } from "@/lib/website-seo/seo/engine";
import { SeoInputError } from "@/lib/website-seo/seo/types";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ ok: false, error: "Expected SEO generation input." }, { status: 400 });
  const input = body as Record<string, unknown>;
  if (typeof input.entityId !== "string" || !input.entityId.trim() ||
    input.pageId !== undefined && (typeof input.pageId !== "string" || !input.pageId.trim()) ||
    input.persist !== undefined && typeof input.persist !== "boolean" ||
    Object.keys(input).some(k => !["entityId", "pageId", "persist"].includes(k))) {
    return Response.json({ ok: false, error: "Expected entityId, optional pageId and persist boolean only." }, { status: 400 });
  }
  try {
    const data = await websiteSeoEngine.generate({ entityId: input.entityId.trim(),
      pageId: typeof input.pageId === "string" ? input.pageId.trim() : undefined, persist: input.persist === true });
    return Response.json({ ok: true, data });
  } catch (error) {
    if (error instanceof SeoInputError) return Response.json({ ok: false, error: error.message }, { status: error.status });
    console.error("[website-seo/seo/generate POST] SEO generation failed.");
    return Response.json({ ok: false, error: "Unable to generate SEO plan." }, { status: 500 });
  }
}
