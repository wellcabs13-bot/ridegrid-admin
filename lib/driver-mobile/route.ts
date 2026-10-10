import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { driverAccess, DriverError, failure, ok, required } from "./access";
import { readDriver } from "./read";
import { recordDriverLocation, transitionDriverTrip } from "@/lib/services/booking/DriverTripService";
export async function driverGet(request: NextRequest, section: string) {
  try { return ok(await readDriver(request, section, await driverAccess(request))); } catch (e) { return failure(e); }
}
export async function driverPost(request: NextRequest, section: string) {
  try {
    const a = await driverAccess(request), b = await request.json();
    if (!b || typeof b !== "object" || Array.isArray(b)) throw new DriverError(400, "Invalid request.");
    if (b.driverId !== undefined && b.driverId !== a.driverId) throw new DriverError(403, "Account access denied.");
    if (section === "location") return ok(await recordDriverLocation(a, b));
    if (section === "trips") return ok(await transitionDriverTrip(a, required(b.bookingId, "booking"), required(b.action, "action")));
    if (section === "notifications") return ok(await prisma.notification.updateMany({ where: { id: required(b.id, "notification"), userId: a.user.id, readAt: null }, data: { readAt: new Date() } }));
    // No monitored emergency response service is configured. Native calling and
    // explicit sharing are the supported safety actions, not an unmonitored SOS.
    throw new DriverError(405, "This action is unavailable. Contact Operations.");
  } catch (e) { return failure(e); }
}
