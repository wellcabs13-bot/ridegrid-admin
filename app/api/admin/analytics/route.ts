import { NextRequest } from "next/server";
import { fail, ok, staffAccess } from "@/lib/admin-api";
import { analytics } from "@/lib/services/admin/AnalyticsAdminService";

export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, ["SUPER_ADMIN", "FINANCE"]);
  if (denied) return denied;
  try {
    const days = Number(request.nextUrl.searchParams.get("days"));
    return ok(await analytics([7, 30, 90, 180, 365].includes(days) ? days : 30));
  } catch (error) {
    return fail(error, "GET /api/admin/analytics");
  }
}
