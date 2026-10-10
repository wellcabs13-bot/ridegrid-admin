import { NextRequest } from "next/server";
import { fail, intParam, ok, staffAccess, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { listPeople } from "@/lib/services/admin/PeopleAdminService";

export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const p = request.nextUrl.searchParams;
    return ok(await listPeople({
      type: p.get("type") || undefined, status: p.get("status") || undefined, q: p.get("q")?.trim() || undefined,
      corporateId: p.get("corporateId") || undefined, page: intParam(p.get("page"), 1), pageSize: intParam(p.get("pageSize"), 25),
    }));
  } catch (error) {
    return fail(error, "GET /api/admin/people");
  }
}
