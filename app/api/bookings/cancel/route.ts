import { NextRequest } from "next/server";
import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";
import { fail, ok } from "@/lib/admin-api";
import { cancelBooking } from "@/lib/services/admin/BookingAdminService";

// Legacy entry point, kept for compatibility. Uses the central cancellation workflow
// (status guard, payment/credit handling, history, audit, BOOKING_CANCELLED event).
export async function POST(req: NextRequest) {
  const access = await requestPermission(req, Permission.BOOKING_CANCEL);
  if (access.denied) return access.denied;
  try {
    const { bookingId, reason } = await req.json();
    return ok(await cancelBooking(String(bookingId || ""), access.user!.id, typeof reason === "string" ? reason : ""));
  } catch (error) {
    return fail(error, "POST /api/bookings/cancel");
  }
}
