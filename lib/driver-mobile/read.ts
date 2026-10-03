import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WELLCABS } from "@/lib/website-public/brand";
import { DriverAccess, DriverError } from "./access";
import { bookingSelect, documentSelect, safeBooking, vehicleSelect } from "./selects";
export async function readDriver(request: NextRequest, section: string, a: DriverAccess) {
  const where = { driverId: a.driverId, deletedAt: null };
  if (section === "config") return { support: WELLCABS, emergencyPhone: process.env.DRIVER_EMERGENCY_PHONE || null, documentUpload: false, profileEdit: false, backgroundLocation: false, pushRegistration: false, payoutHistory: true };
  if (section === "profile") {
    const d = await prisma.driver.findFirst({ where: { id: a.driverId, deletedAt: null }, select: { id: true, firstName: true, lastName: true, status: true, city: true, licenseNumber: true, user: { select: { name: true, email: true, mobile: true, isVerified: true } }, vehicles: { where: { deletedAt: null }, select: vehicleSelect }, documents: { select: documentSelect } } });
    if (!d) throw new DriverError(404, "Profile not found.");
    return { ...d, licenseNumber: `••••${d.licenseNumber.slice(-4)}` };
  }
  if (section === "documents") return prisma.driverDocument.findMany({ where: { driverId: a.driverId }, select: documentSelect, orderBy: { createdAt: "desc" } });
  if (section === "vehicle") {
    const id = request.nextUrl.searchParams.get("id");
    return prisma.vehicle.findMany({ where: { deletedAt: null, ...(id ? { id } : {}), OR: [{ driverId: a.driverId }, { bookings: { some: { ...where, status: { in: ["DRIVER_ASSIGNED", "TRIP_STARTED"] } } } }] }, select: vehicleSelect });
  }
  if (section === "notifications") return prisma.notification.findMany({ where: { userId: a.user.id }, select: { id: true, title: true, message: true, readAt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 });
  if (section === "earnings") {
    const items = await prisma.booking.findMany({ where: { ...where, status: "TRIP_COMPLETED", driverPayout: { not: null } }, select: { id: true, bookingNumber: true, pickupDateTime: true, driverPayout: true }, orderBy: { pickupDateTime: "desc" }, take: 100 });
    const [payrolls, incentives] = await Promise.all([
      prisma.driverPayroll.findMany({ where: { driverId: a.driverId }, select: { id: true, month: true, year: true, basicAmount: true, incentiveAmount: true, penaltyAmount: true, netAmount: true, status: true, paidAt: true }, orderBy: [{ year: "desc" }, { month: "desc" }], take: 24 }),
      prisma.driverIncentive.findMany({ where: { driverId: a.driverId }, select: { id: true, incentiveType: true, amount: true, description: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return { items, payrolls, incentives, description: "Recorded completed-trip allocations, not proof of payment. Latest 100 trips; latest 24 payroll periods. Payroll and trip allocations may overlap; do not add them together.", payoutHistory: true };
  }
  if (section === "trips") {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const b = await prisma.booking.findFirst({ where: { ...where, id }, select: { ...bookingSelect, statusHistory: { select: { id: true, currentStatus: true, remarks: true, changedAt: true }, orderBy: { changedAt: "asc" }, take: 100 } } });
      if (!b) throw new DriverError(404, "Assigned trip not found.");
      // Contact is fetched only for current operational assignments.
      const contact = ["DRIVER_ASSIGNED", "TRIP_STARTED"].includes(b.status) ? await prisma.booking.findFirst({ where: { ...where, id, status: { in: ["DRIVER_ASSIGNED", "TRIP_STARTED"] } }, select: { customer: { select: { user: { select: { mobile: true } } } } } }) : null;
      return { ...safeBooking(b), customerPhone: contact?.customer.user.mobile || null };
    }
    const filter = request.nextUrl.searchParams.get("filter") || "UPCOMING";
    const filters: Record<string, Prisma.BookingWhereInput> = {
      UPCOMING: { status: { in: ["CONFIRMED", "DRIVER_ASSIGNED"] }, OR: [{ trip: null }, { trip: { status: "ASSIGNED", deletedAt: null } }] },
      ACTIVE: { OR: [{ status: "TRIP_STARTED" }, { status: "DRIVER_ASSIGNED", trip: { status: "ARRIVED_AT_PICKUP", deletedAt: null } }] },
      COMPLETED: { status: "TRIP_COMPLETED" }, CANCELLED: { status: "CANCELLED" },
    };
    if (!filters[filter]) throw new DriverError(400, "Invalid trip filter.");
    const page = Number(request.nextUrl.searchParams.get("page") || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new DriverError(400, "Invalid page.");
    const rows = await prisma.booking.findMany({ where: { ...where, ...filters[filter] }, select: bookingSelect, orderBy: [{ pickupDateTime: filter === "COMPLETED" || filter === "CANCELLED" ? "desc" : "asc" }, { id: "asc" }], skip: (page - 1) * 25, take: 26 });
    return { items: rows.slice(0, 25).map(safeBooking), page, hasMore: rows.length > 25 };
  }
  if (section === "dashboard" || section === "today") {
    const now = new Date(), day = new Date(now.getTime() + 19800000).toISOString().slice(0, 10), start = new Date(`${day}T00:00:00+05:30`), end = new Date(start.getTime() + 86400000);
    const [today, next, active, unread, expiringDocuments] = await Promise.all([
      prisma.booking.findMany({ where: { ...where, pickupDateTime: { gte: start, lt: end }, status: { in: ["CONFIRMED", "DRIVER_ASSIGNED", "TRIP_STARTED"] } }, select: bookingSelect, orderBy: { pickupDateTime: "asc" }, take: 20 }),
      prisma.booking.findFirst({ where: { ...where, pickupDateTime: { gte: now }, status: { in: ["CONFIRMED", "DRIVER_ASSIGNED"] } }, select: bookingSelect, orderBy: { pickupDateTime: "asc" } }),
      prisma.booking.findMany({ where: { ...where, OR: [{ status: "TRIP_STARTED" }, { status: "DRIVER_ASSIGNED", trip: { status: "ARRIVED_AT_PICKUP", deletedAt: null } }] }, select: bookingSelect, take: 10 }),
      prisma.notification.count({ where: { userId: a.user.id, readAt: null } }),
      prisma.driverDocument.count({ where: { driverId: a.driverId, expiryDate: { lte: new Date(now.getTime() + 30 * 86400000) } } }),
    ]);
    return { today: today.map(safeBooking), next: next ? safeBooking(next) : null, active: active.map(safeBooking), unread, expiringDocuments, asOf: now };
  }
  throw new DriverError(404, "Not found.");
}

