import { NextRequest } from "next/server";
import { BookingStatus, DriverStatus, PaymentStatus, TicketStatus, TransactionType, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ALL_STAFF, fail, ok, staffAccess } from "@/lib/admin-api";
import { addDays, bookingRevenue, corporateReceivables, istStartOfDay, istStartOfMonth, openUnpaid, paymentTotals, UPCOMING_STATUSES } from "@/lib/services/admin/metrics";

// Operations homepage: every number is an aggregate over central records.
export async function GET(request: NextRequest) {
  const { denied } = await staffAccess(request, ALL_STAFF);
  if (denied) return denied;
  try {
    const now = new Date();
    const today = istStartOfDay(now), tomorrow = addDays(today, 1), month = istStartOfMonth(now);
    const activeVendor = { deletedAt: null, suspendedAt: null, isApproved: true, user: { isActive: true, deletedAt: null } };
    const [
      bookingsToday, upcoming, upcoming24hNoDriver, completedMonth, cancelledMonth, pendingBookings, staleHolds,
      revenueToday, revenueMonth, paymentsMonth, unpaid, receivables,
      activeCustomers, corporateTravellers, activeVendors, verifiedVendors, pendingVendors, suspendedVendors,
      activeVehicles, activeDrivers, activeCorporates, pendingApprovals, refundsDue, openTickets, bookableVehicles, recent,
    ] = await Promise.all([
      prisma.booking.count({ where: { createdAt: { gte: today, lt: tomorrow }, status: { notIn: [BookingStatus.AWAITING_PAYMENT] } } }),
      prisma.booking.count({ where: { deletedAt: null, status: { in: UPCOMING_STATUSES }, pickupDateTime: { gte: now } } }),
      prisma.booking.count({ where: { deletedAt: null, status: { in: UPCOMING_STATUSES }, driverId: null, pickupDateTime: { gte: now, lt: addDays(now, 1) } } }),
      prisma.booking.count({ where: { status: BookingStatus.TRIP_COMPLETED, pickupDateTime: { gte: month } } }),
      prisma.booking.count({ where: { status: BookingStatus.CANCELLED, OR: [{ cancelledAt: { gte: month } }, { cancelledAt: null, updatedAt: { gte: month } }] } }),
      prisma.booking.count({ where: { deletedAt: null, status: BookingStatus.PENDING } }),
      prisma.booking.count({ where: { deletedAt: null, status: BookingStatus.AWAITING_PAYMENT, holdExpiresAt: { lte: now } } }),
      bookingRevenue({ from: today, to: tomorrow }),
      bookingRevenue({ from: month }),
      paymentTotals({ from: month }),
      openUnpaid(),
      corporateReceivables(),
      prisma.customer.count({ where: { deletedAt: null, user: { role: "CUSTOMER", isActive: true, deletedAt: null } } }),
      prisma.corporateEmployee.count({ where: { isActive: true, corporate: { deletedAt: null } } }),
      prisma.vendor.count({ where: activeVendor }),
      prisma.vendor.count({ where: { ...activeVendor, verifiedAt: { not: null } } }),
      prisma.vendor.count({ where: { deletedAt: null, isApproved: false, suspendedAt: null } }),
      prisma.vendor.count({ where: { deletedAt: null, suspendedAt: { not: null } } }),
      prisma.vehicle.count({ where: { deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true } }),
      prisma.driver.count({ where: { deletedAt: null, status: DriverStatus.ACTIVE, user: { isActive: true } } }),
      prisma.corporate.count({ where: { deletedAt: null, status: "ACTIVE" } }),
      prisma.corporateApprovalRequest.count({ where: { status: "PENDING" } }),
      prisma.transaction.aggregate({ where: { transactionType: TransactionType.REFUND, paymentStatus: PaymentStatus.PENDING }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.supportTicket.count({ where: { status: { in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.WAITING_CUSTOMER] } } }),
      // Marketplace-ready: verified available vehicle, active vendor, active driver, active pricing.
      prisma.vehicle.count({ where: { deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true, vendor: activeVendor, driver: { deletedAt: null, status: DriverStatus.ACTIVE, user: { isActive: true, deletedAt: null } }, PricingPackage: { some: { isActive: true } } } }),
      prisma.booking.findMany({
        where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8,
        select: { id: true, bookingNumber: true, status: true, pickupLocation: true, dropLocation: true, pickupDateTime: true, finalFare: true, corporate: { select: { companyName: true } }, customer: { select: { firstName: true, lastName: true } } },
      }),
    ]);
    const outstanding = receivables.reduce((s, r) => s + r.outstanding, 0);
    return ok({
      generatedAt: now,
      bookings: { today: bookingsToday, upcoming, upcoming24hNoDriver, thisMonth: revenueMonth.bookings, completedThisMonth: completedMonth, cancelledThisMonth: cancelledMonth },
      revenue: {
        today: revenueToday.bookingValue, thisMonth: revenueMonth.bookingValue, gstThisMonth: revenueMonth.gst,
        platformFeeThisMonth: revenueMonth.platformFee, snapshotComplete: revenueMonth.snapshotCoverage.complete,
        collectedThisMonth: paymentsMonth.collected, failedPaymentsThisMonth: paymentsMonth.failedCount,
        unpaidAmount: unpaid.amount, unpaidCount: unpaid.count, corporateOutstanding: Math.round(outstanding * 100) / 100,
        refundsDueAmount: Number(refundsDue._sum.amount ?? 0), refundsDueCount: refundsDue._count._all,
      },
      people: { activeCustomers, corporateTravellers, activeVendors, verifiedVendors, pendingVendors, suspendedVendors, activeVehicles, activeDrivers, activeCorporates },
      attention: { pendingApprovals, pendingBookings, staleHolds, upcoming24hNoDriver, refundsDue: refundsDue._count._all, openTickets, failedPayments: paymentsMonth.failedCount },
      marketplace: { bookableVehicles, activeVehicles },
      recent: recent.map(b => ({ id: b.id, bookingNumber: b.bookingNumber, status: b.status, pickupLocation: b.pickupLocation, dropLocation: b.dropLocation, pickupDateTime: b.pickupDateTime, total: Number(b.finalFare ?? 0), customer: `${b.customer.firstName} ${b.customer.lastName}`.trim(), company: b.corporate?.companyName ?? null })),
    });
  } catch (error) {
    return fail(error, "GET /api/admin/dashboard");
  }
}
