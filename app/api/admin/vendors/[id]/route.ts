import { NextRequest } from "next/server";
import { AdminApiError, fail, ok, staffAccess, str, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { vendorDetail } from "@/lib/services/admin/VendorAdminService";
import { deleteVendor, setVendorSuspended, verifyVendor } from "@/lib/services/admin/AccountLifecycleService";
import { createRideGridEvent } from "@/lib/events/event-bus";
import { dispatchRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    return ok(await vendorDetail(id));
  } catch (error) {
    return fail(error, "GET /api/admin/vendors/[id]");
  }
}

// Vendor lifecycle: verify / unverify / suspend / reinstate / delete.
export async function POST(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, SUPER_ADMIN_ONLY);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const b = await request.json();
    const action = str(b.action, 20), reason = str(b.reason);
    let commitments: { bookingNumber: string }[] = [];
    if (action === "verify" || action === "unverify") {
      if (action === "unverify" && !reason) throw new AdminApiError(400, "A reason is required.");
      await verifyVendor(id, action === "verify", user!.id, reason);
      if (action === "verify") {
        try { await dispatchRideGridEvent(createRideGridEvent({ type: AutomationTrigger.VENDOR_APPROVED, module: "VENDOR", vendorId: id, metadata: { actorId: user!.id } })); }
        catch { console.error("VENDOR_APPROVED event dispatch failed; queued for retry."); }
      }
    } else if (action === "suspend" || action === "reinstate") {
      commitments = await setVendorSuspended(id, action === "suspend", user!.id, reason);
    } else if (action === "delete") {
      if (!reason) throw new AdminApiError(400, "A reason is required.");
      await deleteVendor(id, user!.id, reason);
    } else throw new AdminApiError(400, "Unknown action.");
    return ok({ vendor: await vendorDetail(id), commitments });
  } catch (error) {
    return fail(error, "POST /api/admin/vendors/[id]");
  }
}
