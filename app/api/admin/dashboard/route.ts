import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    // Bounded batches avoid a large read transaction and pool bursts.
    const statuses = await prisma.booking.groupBy({ by: ["status"], where: { deletedAt: null }, _count: { _all: true } });
    const [customers, vendors, drivers, vehicles] = await Promise.all([
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.vendor.count({ where: { deletedAt: null } }),
      prisma.driver.count({ where: { deletedAt: null } }),
      prisma.vehicle.count({ where: { deletedAt: null } }),
    ]);
    const [corporates, pendingVendors, support, recentBookings] = await Promise.all([
      prisma.corporate.count({ where: { deletedAt: null } }),
      prisma.vendor.count({ where: { deletedAt: null, isApproved: false } }),
      prisma.supportTicket.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.booking.findMany({
        where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8,
        select: { id: true, bookingNumber: true, status: true, pickupLocation: true, dropLocation: true, pickupDateTime: true, bookingSource: true, customer: { select: { firstName: true, lastName: true } } },
      }),
    ]);
    return NextResponse.json({ success: true, data: {
      counts: { customers, vendors, drivers, vehicles, corporates, pendingVendors },
      bookingStatuses: statuses.map(item => ({ status: item.status, count: item._count._all })),
      supportStatuses: support.map(item => ({ status: item.status, count: item._count._all })),
      recentBookings, fetchedAt: new Date().toISOString(),
    } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to load operational data. Please retry." }, { status: 500 });
  }
}
