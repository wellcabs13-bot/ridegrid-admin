import { NextRequest } from "next/server";
import { AdminApiError, FINANCE_STAFF, fail, intParam, ok, staffAccess, str } from "@/lib/admin-api";
import { completeRefund, corporateReceivableRows, financeSummary, listTransactions, vendorPayableRows } from "@/lib/services/admin/FinanceAdminService";
import { parseRange } from "@/lib/services/admin/metrics";

export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, FINANCE_STAFF);
  if (denied) return denied;
  try {
    const p = request.nextUrl.searchParams;
    const range = parseRange(p);
    const view = p.get("view") || "summary";
    const scope = { vendorId: p.get("vendorId") || undefined, corporateId: p.get("corporateId") || undefined };
    if (view === "summary") return ok(await financeSummary(range, scope));
    if (view === "transactions") return ok(await listTransactions({ ...range, ...scope, type: p.get("type") || undefined, status: p.get("status") || undefined, channel: p.get("channel") || undefined, q: p.get("q") || undefined, page: intParam(p.get("page"), 1), pageSize: Math.min(intParam(p.get("pageSize"), 25), 100) }));
    if (view === "vendors") return ok(await vendorPayableRows());
    if (view === "corporates") return ok(await corporateReceivableRows());
    throw new AdminApiError(400, "Unknown finance view.");
  } catch (error) {
    return fail(error, "GET /api/admin/finance");
  }
}

export async function POST(request: NextRequest) {
  const { user, denied } = await staffAccess(request, FINANCE_STAFF);
  if (denied) return denied;
  try {
    const b = await request.json();
    if (b.action === "complete-refund") { await completeRefund(str(b.transactionId, 60), str(b.reference, 120), user!.id); return ok({ completed: true }); }
    throw new AdminApiError(400, "Unknown action.");
  } catch (error) {
    return fail(error, "POST /api/admin/finance");
  }
}
