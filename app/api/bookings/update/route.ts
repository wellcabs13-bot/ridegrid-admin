import { NextRequest, NextResponse } from "next/server";
import { requestPermission } from "@/lib/request-access";
import { Permission } from "@/lib/permissions";

// Retired: this endpoint allowed arbitrary status/vendor/fare rewrites. Booking
// corrections now go through the controlled, audited admin service:
//   PATCH /api/admin/bookings/{id}   (addresses, same-day pickup time, driver)
//   POST  /api/admin/bookings/{id}   { action: "cancel" | "archive" | "restore" }
export async function PUT(req: NextRequest) {
  const access = await requestPermission(req, Permission.BOOKING_UPDATE);
  if (access.denied) return access.denied;
  return NextResponse.json({ success: false, message: "This endpoint has been retired. Use PATCH /api/admin/bookings/{id}." }, { status: 410 });
}
