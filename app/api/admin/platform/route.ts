import { NextRequest } from "next/server";
import { AdminApiError, fail, intParam, ok, staffAccess, str, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { aiView, automationView, notificationsView, runRetryQueue, securityView, setAutomationRuleEnabled, setTemplateActive } from "@/lib/services/admin/PlatformAdminService";

export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const p = request.nextUrl.searchParams;
    const view = p.get("view");
    if (view === "notifications") return ok(await notificationsView({ type: p.get("type") || undefined, status: p.get("status") || undefined, q: p.get("q")?.trim() || undefined, page: intParam(p.get("page"), 1) }));
    if (view === "automation") return ok(await automationView());
    if (view === "security") return ok(await securityView({ entity: p.get("entity") || undefined, action: p.get("action") || undefined, page: intParam(p.get("page"), 1) }));
    if (view === "ai") return ok(aiView());
    throw new AdminApiError(400, "Unknown view.");
  } catch (error) {
    return fail(error, "GET /api/admin/platform");
  }
}

export async function POST(request: NextRequest) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const b = await request.json();
    if (b.action === "template-active") { await setTemplateActive(str(b.kind, 20), str(b.id, 60), b.active === true, user!.id); return ok({ updated: true }); }
    if (b.action === "process-retry-queue") return ok(await runRetryQueue(user!.id));
    if (b.action === "rule-enabled") return ok(await setAutomationRuleEnabled(str(b.id, 20), b.enabled === true, user!.id));
    throw new AdminApiError(400, "Unknown action.");
  } catch (error) {
    return fail(error, "POST /api/admin/platform");
  }
}
