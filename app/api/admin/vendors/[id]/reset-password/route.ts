import { NextRequest } from "next/server";
import { fail, ok, staffAccess, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { resetLoginPassword } from "@/lib/services/admin/AdminPasswordResetService";

type Context = { params: Promise<{ id: string }> };

// Super Admin: replace a vendor's login password with a one-time temporary password.
export async function POST(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    return ok(await resetLoginPassword("VENDOR", id, user!.id));
  } catch (error) {
    return fail(error, "POST /api/admin/vendors/[id]/reset-password");
  }
}
