import { NextRequest } from "next/server";
import { authorize } from "@/lib/authorize";
import { syncRealEntities } from "@/lib/website-seo/entities/real-sync";
import { prepareRealPilot, RealPilotError } from "@/lib/website-seo/scale/real-pilot";
import { websiteSeoApiError, websiteSeoApiSuccess } from "@/lib/website-seo/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const user = authorize(request.cookies.get("ridegrid_access_token")?.value, ["SUPER_ADMIN"]);
  if (!user) return websiteSeoApiError("Administrator access required.", 403);
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return websiteSeoApiError("Expected a JSON object.", 400);
    if (body.action === "preparePilot") return websiteSeoApiSuccess(await prepareRealPilot(user.id));
    if (typeof body.dryRun !== "boolean" || (body.offset !== undefined && (!Number.isInteger(body.offset) || body.offset < 0))) return websiteSeoApiError("Expected dryRun and an optional non-negative offset.", 400);
    return websiteSeoApiSuccess(await syncRealEntities({ dryRun: body.dryRun, offset: body.offset, actor: user.id }));
  } catch (error) { if (error instanceof RealPilotError) return websiteSeoApiError(error.message, 409); if (error instanceof SyntaxError) return websiteSeoApiError("Expected a JSON request body.", 400); return websiteSeoApiError("Real entity sync unavailable. Check the database and marketplace sources. No publishing was requested."); }
}
