import { NextRequest } from "next/server";
import { OPERATIONS_STAFF, fail, ok, staffAccess } from "@/lib/admin-api";
import { liveOperations } from "@/lib/services/admin/LiveOperationsService";

// Super Admin / Operations only. Read-only: no location or booking is changed here.
export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, OPERATIONS_STAFF);
  if (denied) return denied;
  try {
    return ok(await liveOperations());
  } catch (error) {
    return fail(error, "GET /api/admin/live-operations");
  }
}
