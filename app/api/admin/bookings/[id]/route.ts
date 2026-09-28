import { NextRequest } from "next/server";
import { AdminApiError, fail, ok, OPERATIONS_STAFF, staffAccess, str, SUPER_ADMIN_ONLY } from "@/lib/admin-api";
import { bookingDetail, cancelBooking, editOptions, setArchived, updateBooking } from "@/lib/services/admin/BookingAdminService";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  const { denied } = await staffAccess(request, OPERATIONS_STAFF);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    if (request.nextUrl.searchParams.get("editOptions") === "1") return ok(await editOptions(id));
    return ok(await bookingDetail(id));
  } catch (error) {
    return fail(error, "GET /api/admin/bookings/[id]");
  }
}

// Controlled correction (addresses, pickup time within the same day, driver).
export async function PATCH(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, OPERATIONS_STAFF);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const b = await request.json();
    return ok(await updateBooking(id, {
      pickupLocation: typeof b.pickupLocation === "string" ? b.pickupLocation : undefined,
      dropLocation: typeof b.dropLocation === "string" ? b.dropLocation : undefined,
      pickupDateTime: typeof b.pickupDateTime === "string" ? b.pickupDateTime : undefined,
      driverId: typeof b.driverId === "string" ? b.driverId : undefined,
      reason: str(b.reason),
    }, user!.id));
  } catch (error) {
    return fail(error, "PATCH /api/admin/bookings/[id]");
  }
}

// Lifecycle actions. Cancel follows the central cancellation workflow; archive and
// restore are Super Admin only.
export async function POST(request: NextRequest, context: Context) {
  const { user, denied } = await staffAccess(request, OPERATIONS_STAFF);
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const b = await request.json();
    const action = str(b.action, 20);
    if (action === "cancel") return ok(await cancelBooking(id, user!.id, str(b.reason)));
    if (action === "archive" || action === "restore") {
      if (!SUPER_ADMIN_ONLY.includes(user!.role)) throw new AdminApiError(403, "Only a Super Admin can archive bookings.");
      return ok(await setArchived(id, action === "archive", user!.id, str(b.reason)));
    }
    throw new AdminApiError(400, "Unknown booking action.");
  } catch (error) {
    return fail(error, "POST /api/admin/bookings/[id]");
  }
}
