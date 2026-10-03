import { BookingStatus, DriverStatus, Prisma, VehicleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AccountLifecycleError } from "@/lib/services/admin/AccountLifecycleService";
import { bookingRevenue, paymentTotals, REVENUE_STATUSES, UPCOMING_STATUSES, vendorPayables } from "@/lib/services/admin/metrics";

// Super Admin vendor management over the central Vendor/Vehicle/Driver/Booking
// records. Vendor earnings and payables come from metrics.ts, the same numbers
// Finance and Reports use.

export type VendorState = "ACTIVE" | "PENDING" | "SUSPENDED" | "DELETED";

export function vendorState(v: { deletedAt: Date | null; suspendedAt: Date | null; isApproved: boolean }): VendorState {
  if (v.deletedAt) return "DELETED";
  if (v.suspendedAt) return "SUSPENDED";
  return v.isApproved ? "ACTIVE" : "PENDING";
}

function stateWhere(status?: string): Prisma.VendorWhereInput {
  switch (status) {
    case "ACTIVE": return { deletedAt: null, suspendedAt: null, isApproved: true };
    case "VERIFIED": return { deletedAt: null, suspendedAt: null, isApproved: true, verifiedAt: { not: null } };
    case "PENDING": return { deletedAt: null, suspendedAt: null, isApproved: false };
    case "SUSPENDED": return { deletedAt: null, suspendedAt: { not: null } };
    case "DELETED": return { deletedAt: { not: null } };
    default: return { deletedAt: null };
  }
}

const bookable = (vehicleWhere: Prisma.VehicleWhereInput = {}): Prisma.VehicleWhereInput => ({
  ...vehicleWhere, deletedAt: null, status: VehicleStatus.AVAILABLE, isVerified: true,
  driver: { deletedAt: null, status: DriverStatus.ACTIVE, user: { isActive: true, deletedAt: null } },
  PricingPackage: { some: { isActive: true } },
});

export async function listVendors(f: { status?: string; q?: string; page?: number; pageSize?: number }) {
  const pageSize = Math.min(Math.max(f.pageSize || 25, 5), 100), page = Math.max(f.page || 1, 1);
  const q = f.q?.trim();
  const where: Prisma.VendorWhereInput = {
    ...stateWhere(f.status),
    ...(q ? { OR: [{ companyName: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { user: { name: { contains: q, mode: "insensitive" } } }, { user: { email: { contains: q, mode: "insensitive" } } }, { user: { mobile: { contains: q } } }] } : {}),
  };
  const [total, vendors] = await Promise.all([
    prisma.vendor.count({ where }),
    prisma.vendor.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, select: { id: true, companyName: true, city: true, homeCity: true, isApproved: true, verifiedAt: true, suspendedAt: true, suspensionReason: true, deletedAt: true, createdAt: true, user: { select: { name: true, email: true, mobile: true } } } }),
  ]);
  const ids = vendors.map(v => v.id);
  const [bookingGroups, upcoming, vehicles, marketplace, payables] = await Promise.all([
    ids.length ? prisma.booking.groupBy({ by: ["vendorId", "status"], where: { vendorId: { in: ids } }, _count: { _all: true }, _sum: { finalFare: true } }) : [],
    ids.length ? prisma.booking.groupBy({ by: ["vendorId"], where: { vendorId: { in: ids }, deletedAt: null, OR: [{ status: BookingStatus.TRIP_STARTED }, { status: { in: UPCOMING_STATUSES }, pickupDateTime: { gte: new Date() } }] }, _count: { _all: true } }) : [],
    ids.length ? prisma.vehicle.findMany({ where: { vendorId: { in: ids }, deletedAt: null }, select: { vendorId: true, status: true, driverId: true, driver: { select: { status: true, deletedAt: true } } } }) : [],
    ids.length ? prisma.vehicle.groupBy({ by: ["vendorId"], where: bookable({ vendorId: { in: ids } }), _count: { _all: true } }) : [],
    vendorPayables(ids),
  ]);
  const rows = vendors.map(v => {
    const groups = bookingGroups.filter(g => g.vendorId === v.id);
    const fleet = vehicles.filter(x => x.vendorId === v.id);
    const drivers = new Set(fleet.filter(x => x.driverId && x.driver && !x.driver.deletedAt && x.driver.status === DriverStatus.ACTIVE).map(x => x.driverId));
    const state = vendorState(v);
    const pay = payables.get(v.id);
    return {
      id: v.id, companyName: v.companyName, city: v.city || v.homeCity, contact: v.user.name, email: state === "DELETED" ? "—" : v.user.email, mobile: v.user.mobile,
      state, verified: v.isApproved && !!v.verifiedAt, verifiedAt: v.verifiedAt, suspendedAt: v.suspendedAt, suspensionReason: v.suspensionReason, joined: v.createdAt,
      activeVehicles: fleet.filter(x => x.status === VehicleStatus.AVAILABLE).length, totalVehicles: fleet.length, activeDrivers: drivers.size,
      trips: groups.filter(g => g.status !== BookingStatus.AWAITING_PAYMENT).reduce((s, g) => s + g._count._all, 0),
      completed: groups.find(g => g.status === BookingStatus.TRIP_COMPLETED)?._count._all ?? 0,
      current: upcoming.find(u => u.vendorId === v.id)?._count._all ?? 0,
      grossValue: Math.round(groups.filter(g => REVENUE_STATUSES.includes(g.status)).reduce((s, g) => s + Number(g._sum.finalFare ?? 0), 0) * 100) / 100,
      earned: pay?.earned ?? 0, paid: pay?.paid ?? 0, outstanding: pay?.outstanding ?? 0,
      marketplaceVehicles: state === "ACTIVE" ? marketplace.find(m => m.vendorId === v.id)?._count._all ?? 0 : 0,
    };
  });
  return { rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function vendorDetail(id: string) {
  const v = await prisma.vendor.findUnique({
    where: { id },
    select: {
      id: true, companyName: true, homeCity: true, fleetSize: true, address: true, city: true, state: true, pinCode: true,
      bankName: true, accountNumber: true, ifscCode: true, branchName: true, isApproved: true, verifiedAt: true, suspendedAt: true, suspensionReason: true, deletedAt: true, createdAt: true,
      user: { select: { name: true, email: true, mobile: true, isActive: true } },
      wallet: { select: { balance: true, updatedAt: true } },
      documents: { orderBy: { createdAt: "desc" }, select: { id: true, documentType: true, documentNumber: true, fileUrl: true, status: true, expiryDate: true, createdAt: true } },
      vehicles: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, select: { id: true, make: true, model: true, registrationNumber: true, category: true, status: true, isVerified: true, driver: { select: { id: true, firstName: true, lastName: true, status: true, user: { select: { mobile: true } } } }, _count: { select: { PricingPackage: { where: { isActive: true } } } } } },
      settlements: { orderBy: { createdAt: "desc" }, take: 20, select: { id: true, netAmount: true, settlementStatus: true, settlementReference: true, settledAt: true, createdAt: true } },
    },
  });
  if (!v) throw new AccountLifecycleError(404, "Vendor not found.");
  const [revenue, payments, payables, bookings, upcoming, history, bookableCount] = await Promise.all([
    bookingRevenue({}, { vendorId: id }), paymentTotals({}, { vendorId: id }), vendorPayables([id]),
    prisma.booking.findMany({ where: { vendorId: id }, orderBy: { pickupDateTime: "desc" }, take: 25, select: { id: true, bookingNumber: true, status: true, pickupDateTime: true, finalFare: true, vendorEarning: true, deletedAt: true, corporate: { select: { companyName: true } }, customer: { select: { firstName: true, lastName: true } } } }),
    prisma.booking.findMany({ where: { vendorId: id, deletedAt: null, OR: [{ status: BookingStatus.TRIP_STARTED }, { status: { in: UPCOMING_STATUSES }, pickupDateTime: { gte: new Date() } }] }, orderBy: { pickupDateTime: "asc" }, take: 50, select: { id: true, bookingNumber: true, status: true, pickupDateTime: true } }),
    prisma.auditLog.findMany({ where: { entityName: "Vendor", entityId: id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, action: true, newValue: true, createdAt: true, user: { select: { name: true } } } }),
    prisma.vehicle.count({ where: bookable({ vendorId: id }) }),
  ]);
  const state = vendorState(v);
  const pay = payables.get(id) ?? { earned: 0, paid: 0, inProcess: 0, outstanding: 0, completedTrips: 0 };
  return {
    id: v.id, companyName: v.companyName, state, verified: v.isApproved && !!v.verifiedAt, verifiedAt: v.verifiedAt, suspendedAt: v.suspendedAt, suspensionReason: v.suspensionReason, createdAt: v.createdAt,
    contact: { name: v.user.name, email: state === "DELETED" ? null : v.user.email, mobile: v.user.mobile, loginActive: v.user.isActive },
    profile: { homeCity: v.homeCity, fleetSize: v.fleetSize, address: v.address, city: v.city, state: v.state, pinCode: v.pinCode },
    bank: { bankName: v.bankName, accountNumber: v.accountNumber ? `•••• ${v.accountNumber.slice(-4)}` : null, ifscCode: v.ifscCode, branchName: v.branchName },
    documents: v.documents,
    vehicles: v.vehicles.map(x => ({ id: x.id, label: `${x.make} ${x.model}`, registrationNumber: x.registrationNumber, category: x.category, status: x.status, verified: x.isVerified, activePricing: x._count.PricingPackage, driver: x.driver ? { id: x.driver.id, name: `${x.driver.firstName} ${x.driver.lastName}`.trim(), status: x.driver.status, mobile: x.driver.user?.mobile ?? null } : null })),
    marketplace: { listed: state === "ACTIVE" && bookableCount > 0, bookableVehicles: state === "ACTIVE" ? bookableCount : 0, reason: state === "SUSPENDED" ? "Vendor suspended" : state === "PENDING" ? "Awaiting verification" : state === "DELETED" ? "Vendor deleted" : bookableCount ? null : "No verified vehicle with an active driver and active pricing" },
    finance: {
      grossValue: revenue.bookingValue, gst: revenue.gst, vendorEarningBooked: revenue.vendorEarning,
      earned: pay.earned, paid: pay.paid, inProcess: pay.inProcess, outstanding: pay.outstanding, completedTrips: pay.completedTrips,
      collected: payments.collected, refundsDue: payments.refundsPending,
      walletBalance: v.wallet ? Number(v.wallet.balance) : null,
    },
    settlements: v.settlements.map(s => ({ ...s, netAmount: Number(s.netAmount) })),
    bookings: bookings.map(b => ({ id: b.id, bookingNumber: b.bookingNumber, status: b.status, pickupDateTime: b.pickupDateTime, total: Number(b.finalFare ?? 0), vendorAmount: Number(b.vendorEarning ?? 0), archived: !!b.deletedAt, customer: `${b.customer.firstName} ${b.customer.lastName}`.trim(), company: b.corporate?.companyName ?? null })),
    commitments: upcoming,
    history,
  };
}
