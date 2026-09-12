import { NextRequest } from "next/server";
import { ContentInputError } from "../content/types";
import { SeoInputError } from "../seo/types";
import { PublishingError } from "./types";
import { publishingIndexingEngine } from "./engine";
export async function publicationHttp(request: NextRequest, action: string) {
  if (!["publish", "unpublish", "preview", "sync"].includes(action)) return Response.json({ ok: false, error: "Unknown action." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: "Invalid JSON." }, { status: 400 }); }
  const input = body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  if (typeof input.entityId !== "string" || !input.entityId.trim() || typeof input.pageId !== "string" || !input.pageId.trim() ||
    Object.keys(input).some(k => !["entityId", "pageId"].includes(k))) return Response.json({ ok: false, error: "Expected existing entityId and pageId only." }, { status: 400 });
  try {
    const args: [string, string] = [input.entityId.trim(), input.pageId.trim()];
    const data = action === "unpublish" ? await publishingIndexingEngine.unpublish(...args) : action === "sync"
      ? await publishingIndexingEngine.sync(...args) : await publishingIndexingEngine.publish(...args, action === "preview");
    return Response.json({ ok: true, data });
  } catch (error) {
    if (error instanceof PublishingError || error instanceof SeoInputError || error instanceof ContentInputError) {
      return Response.json({ ok: false, error: error.message }, { status: error.status });
    }
    return Response.json({ ok: false, error: "Publication operation failed." }, { status: 500 });
  }
}
