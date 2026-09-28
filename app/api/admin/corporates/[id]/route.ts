import { NextRequest } from "next/server";
import { AdminApiError, fail, ok, staffAccess, str, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { corporateDetail, provisionEmployeeLogin, updateCorporate } from "@/lib/services/admin/CorporateAdminService";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    return ok(await corporateDetail(id));
  } catch (error) {
    return fail(error, "GET /api/admin/corporates/[id]");
  }
}

// Commercial controls: status, credit limit, billing cycle, payment terms.
export async function PATCH(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const b = await request.json();
    await updateCorporate(id, {
      status: typeof b.status === "string" ? b.status : undefined,
      creditLimit: b.creditLimit === undefined || b.creditLimit === "" ? undefined : Number(b.creditLimit),
      billingCycle: typeof b.billingCycle === "string" ? b.billingCycle : undefined,
      paymentTermsDays: b.paymentTermsDays === undefined || b.paymentTermsDays === "" ? undefined : Number(b.paymentTermsDays),
    }, user!.id, str(b.reason));
    return ok(await corporateDetail(id));
  } catch (error) {
    return fail(error, "PATCH /api/admin/corporates/[id]");
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const b = await request.json();
    if (b.action === "provision-login") return ok(await provisionEmployeeLogin(id, str(b.employeeId, 60), user!.id));
    throw new AdminApiError(400, "Unknown action.");
  } catch (error) {
    return fail(error, "POST /api/admin/corporates/[id]");
  }
}
