import { NextRequest } from "next/server";
import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { fail, ok } from "@/lib/admin-api";
import { setArchived } from "@/lib/services/admin/BookingAdminService";

// Legacy entry point. "Delete" is a safe archive: only cancelled/completed bookings,
// financial and audit history preserved, action audited.
export async function DELETE(req: NextRequest) {
  const access = await requestPermission(req, Permission.BOOKING_UPDATE);
  if (access.denied) return access.denied;
  try {
    const { bookingId, reason } = await req.json();
    return ok(await setArchived(String(bookingId || ""), true, access.user!.id, typeof reason === "string" ? reason : undefined));
  } catch (error) {
    return fail(error, "DELETE /api/bookings/delete");
  }
}
