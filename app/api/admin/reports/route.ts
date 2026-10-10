import { NextRequest } from "next/server";
import { AdminApiError, fail, intParam, ok, staffAccess } from "@/lib/admin-api";
import { parseRange } from "@/lib/services/admin/metrics";
import { REPORTS, ReportName, runReport } from "@/lib/services/admin/ReportsAdminService";

// REPORT_VIEW holders among platform staff (Super Admin, Finance).
export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, ["SUPER_ADMIN", "FINANCE"]);
  if (denied) return denied;
  try {
    const p = request.nextUrl.searchParams;
    const report = p.get("report") as ReportName;
    if (!REPORTS.includes(report)) throw new AdminApiError(400, "Unknown report.");
    const filters = Object.fromEntries(["status", "source", "segment", "vendorId", "corporateId", "type", "channel"].map(k => [k, p.get(k) || undefined]));
    const exportAll = p.get("export") === "1";
    return ok(await runReport(report, parseRange(p), filters, exportAll ? 1 : intParam(p.get("page"), 1), exportAll ? 5000 : Math.min(intParam(p.get("pageSize"), 50), 200)));
  } catch (error) {
    return fail(error, "GET /api/admin/reports");
  }
}
