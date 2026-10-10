import { NextRequest } from "next/server";
import { fail, intParam, ok, OPERATIONS_STAFF, staffAccess } from "@/lib/admin-api";
import { bookingFilterOptions, listBookings } from "@/lib/services/admin/BookingAdminService";
import { parseRange } from "@/lib/services/admin/metrics";

export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, OPERATIONS_STAFF);
  if (denied) return denied;
  try {
    const p = request.nextUrl.searchParams;
    if (p.get("options") === "1") return ok(await bookingFilterOptions());
    const range = parseRange(p);
    return ok(await listBookings({
      q: p.get("q")?.trim() || undefined, customer: p.get("customer")?.trim() || undefined,
      from: range.from, to: range.to, dateField: p.get("dateField") === "created" ? "created" : "pickup",
      source: p.get("source") || undefined, status: p.get("status") || undefined, paymentStatus: p.get("paymentStatus") || undefined,
      segment: p.get("segment") || undefined, corporateId: p.get("corporateId") || undefined, vendorId: p.get("vendorId") || undefined,
      vehicleId: p.get("vehicleId") || undefined, driverId: p.get("driverId") || undefined,
      archived: p.get("archived") === "1", page: intParam(p.get("page"), 1), pageSize: Math.min(intParam(p.get("pageSize"), 25), 100), withStatusCounts: true,
    }));
  } catch (error) {
    return fail(error, "GET /api/admin/bookings");
  }
}
