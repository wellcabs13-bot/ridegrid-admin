import { NextRequest } from "next/server";
import { AdminApiError, fail, ok, staffAccess, str, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { personDetail, PersonType, updateRetailProfile } from "@/lib/services/admin/PeopleAdminService";
import { deleteCustomer, deleteEmployee, setCustomerActive, setEmployeeActive } from "@/lib/services/admin/AccountLifecycleService";

type Context = { params: Promise<{ kind: string; id: string }> };

async function target(context: Context) {
  const { kind, id } = await context.params;
  const k = kind.toUpperCase();
  if (k !== "RETAIL" && k !== "CORPORATE") throw new AdminApiError(404, "Unknown account type.");
  return { kind: k as PersonType, id };
}

export async function GET(request: NextRequest, context: Context) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { kind, id } = await target(context);
    return ok(await personDetail(kind, id));
  } catch (error) {
    return fail(error, "GET /api/admin/people/[kind]/[id]");
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { kind, id } = await target(context);
    if (kind !== "RETAIL") throw new AdminApiError(400, "Corporate traveller profiles are managed by the company in the Corporate Portal.");
    const b = await request.json();
    await updateRetailProfile(id, { firstName: str(b.firstName, 80), lastName: str(b.lastName, 80), email: str(b.email, 200), mobile: typeof b.mobile === "string" ? str(b.mobile, 20) : undefined }, user!.id);
    return ok(await personDetail(kind, id));
  } catch (error) {
    return fail(error, "PATCH /api/admin/people/[kind]/[id]");
  }
}

export async function POST(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { kind, id } = await target(context);
    const b = await request.json();
    const action = str(b.action, 20), reason = str(b.reason);
    if (action === "suspend" || action === "reactivate") {
      if (action === "suspend" && !reason) throw new AdminApiError(400, "A reason is required.");
      if (kind === "RETAIL") await setCustomerActive(id, action === "reactivate", user!.id, reason);
      else await setEmployeeActive(id, action === "reactivate", user!.id, reason);
    } else if (action === "delete") {
      if (!reason) throw new AdminApiError(400, "A reason is required.");
      if (kind === "RETAIL") await deleteCustomer(id, user!.id, reason);
      else await deleteEmployee(id, user!.id, reason);
    } else throw new AdminApiError(400, "Unknown action.");
    return ok(await personDetail(kind, id));
  } catch (error) {
    return fail(error, "POST /api/admin/people/[kind]/[id]");
  }
}
