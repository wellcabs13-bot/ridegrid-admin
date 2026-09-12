import { NextRequest } from "next/server";
import { keywordIntelligenceEngine, KeywordEntityNotFoundError } from "@/lib/website-seo/keywords/engine";

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ ok: false, error: "Expected entityId and optional persist boolean." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  if (typeof input.entityId !== "string" || !input.entityId.trim() ||
    (input.persist !== undefined && typeof input.persist !== "boolean") ||
    Object.keys(input).some(key => !["entityId", "persist"].includes(key))) {
    return Response.json({ ok: false, error: "Expected entityId and optional persist boolean only." }, { status: 400 });
  }
  try {
    const data = await keywordIntelligenceEngine.generate(input.entityId.trim(), input.persist === true);
    return Response.json({ ok: true, data });
  } catch (error) {
    if (error instanceof KeywordEntityNotFoundError) {
      return Response.json({ ok: false, error: error.message }, { status: 404 });
    }
    console.error("[website-seo/keywords/generate POST]", error);
    return Response.json({ ok: false, error: "Unable to generate keywords." }, { status: 500 });
  }
}
