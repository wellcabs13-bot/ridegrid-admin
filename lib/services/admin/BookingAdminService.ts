import {
  AuditAction, BookingSource, BookingStatus, BookingStatusAction, DriverStatus, PaymentMethod, PaymentStatus,
  Prisma, TransactionType, WalletTransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/services/admin/AccountLifecycleService";
import { findBookingConflict, reservationWindowFromPickup } from "@/lib/services/marketplace/BookingAvailabilityService";
import { notifyAssignedDriver, pushAssignedDriver } from "@/lib/services/booking/DriverNotification";
import { emitRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";

// Controlled Super Admin booking operations. Every change goes through this service:
// validated, transactional, audited, and never rewriting settled payments.

export class BookingAdminError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "BookingAdminError"; }
}

const TERMINAL: BookingStatus[] = [BookingStatus.CANCELLED, BookingStatus.TRIP_COMPLETED];

// ---------- Listing ----------

export type BookingFilters = {
  q?: string; from?: Date; to?: Date; dateField?: "pickup" | "created";
  source?: string; status?: string; paymentStatus?: string; segment?: string;
  corporateId?: string; vendorId?: string; vehicleId?: string; driverId?: string; customer?: string;
  archived?: boolean; page?: number; pageSize?: number;
  // Opt-in: also return a per-status count of the other active filters (for the status tabs).
  withStatusCounts?: boolean;
};

export function bookingWhere(f: BookingFilters): Prisma.BookingWhereInput {
  const range = f.from || f.to ? { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } : undefined;
  const and: Prisma.BookingWhereInput[] = [];
  if (f.customer) and.push({ customer: { OR: [
    { firstName: { contains: f.customer, mode: "insensitive" } }, { lastName: { contains: f.customer, mode: "insensitive" } },
    { user: { email: { contains: f.customer, mode: "insensitive" } } }, { user: { mobile: { contains: f.customer } } },
  ] } });
  if (f.q) and.push({ OR: [
    { bookingNumber: { contains: f.q, mode: "insensitive" } }, { pickupLocation: { contains: f.q, mode: "insensitive" } },
    { dropLocation: { contains: f.q, mode: "insensitive" } }, { vehicle: { registrationNumber: { contains: f.q, mode: "insensitive" } } },
  ] });
  return {
    deletedAt: f.archived ? { not: null } : null,
    ...(range ? (f.dateField === "created" ? { createdAt: range } : { pickupDateTime: range }) : {}),
    ...(f.source && Object.values(BookingSource).includes(f.source as BookingSource) ? { bookingSource: f.source as BookingSource } : {}),
    ...(f.status && Object.values(BookingStatus).includes(f.status as BookingStatus) ? { status: f.status as BookingStatus } : {}),
    ...(f.paymentStatus && Object.values(PaymentStatus).includes(f.paymentStatus as PaymentStatus)
      ? { transactions: { some: { transactionType: TransactionType.BOOKING_PAYMENT, paymentStatus: f.paymentStatus as PaymentStatus } } } : {}),
    ...(f.segment === "RETAIL" ? { corporateId: null } : f.segment === "CORPORATE" ? { corporateId: { not: null } } : {}),
    ...(f.corporateId ? { corporateId: f.corporateId } : {}),
    ...(f.vendorId ? { vendorId: f.vendorId } : {}),
    ...(f.vehicleId ? { vehicleId: f.vehicleId } : {}),
    ...(f.driverId ? { driverId: f.driverId } : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

const listSelect = {
  id: true, bookingNumber: true, bookingSource: true, status: true, tripType: true, pickupLocation: true, dropLocation: true,
  pickupDateTime: true, createdAt: true, deletedAt: true, finalFare: true, estimatedFare: true, taxAmount: true, vendorEarning: true,
  holdExpiresAt: true, priceSnapshot: true,
  customer: { select: { id: true, firstName: true, lastName: true, user: { select: { email: true, mobile: true, role: true } } } },
  corporate: { select: { id: true, companyName: true } },
  vendor: { select: { id: true, companyName: true } },
  vehicle: { select: { id: true, make: true, model: true, registrationNumber: true, category: true } },
  driver: { select: { id: true, firstName: true, lastName: true } },
  transactions: {
    where: { transactionType: TransactionType.BOOKING_PAYMENT }, orderBy: { createdAt: "desc" as const }, take: 1,
    select: { paymentMethod: true, paymentStatus: true, amount: true, referenceNumber: true, gatewayName: true, gatewayTransactionId: true },
  },
} satisfies Prisma.BookingSelect;

type ListRow = Prisma.BookingGetPayload<{ select: typeof listSelect }>;

export function sourceLabel(b: { bookingSource: BookingSource; corporateId?: string | null; customer?: { user?: { role?: string | null } | null } | null }) {
  if (b.bookingSource === BookingSource.CORPORATE)
    return b.customer?.user?.role === "CORPORATE_ADMIN" ? "Corporate Portal" : "Corporate Employee";
  return b.bookingSource === BookingSource.APP ? "Customer App" : "Retail Website";
}

function snapshotNumber(snapshot: Prisma.JsonValue | null, key: string) {
  const value = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? (snapshot as Record<string, unknown>)[key] : undefined;
  return value === undefined || value === null ? null : Number(value);
}

function serializeRow(b: ListRow) {
  const tx = b.transactions[0];
  return {
    id: b.id, bookingNumber: b.bookingNumber, source: b.bookingSource, sourceLabel: sourceLabel({ ...b, corporateId: b.corporate?.id }),
    status: b.status, tripType: b.tripType, pickupLocation: b.pickupLocation, dropLocation: b.dropLocation,
    pickupDateTime: b.pickupDateTime, createdAt: b.createdAt, archivedAt: b.deletedAt,
    holdExpired: b.status === BookingStatus.AWAITING_PAYMENT && !!b.holdExpiresAt && b.holdExpiresAt <= new Date(),
    customer: { id: b.customer.id, name: `${b.customer.firstName} ${b.customer.lastName}`.trim(), email: b.customer.user.email, mobile: b.customer.user.mobile },
    corporate: b.corporate, vendor: b.vendor,
    vehicle: { id: b.vehicle.id, label: `${b.vehicle.make} ${b.vehicle.model}`, registrationNumber: b.vehicle.registrationNumber, category: b.vehicle.category },
    driver: b.driver ? { id: b.driver.id, name: `${b.driver.firstName} ${b.driver.lastName}`.trim() } : null,
    fare: {
      total: Number(b.finalFare ?? b.estimatedFare), gst: b.taxAmount == null ? null : Number(b.taxAmount),
      platformFee: snapshotNumber(b.priceSnapshot, "platformFee"), vendorAmount: b.vendorEarning == null ? null : Number(b.vendorEarning),
    },
    payment: tx ? { method: tx.paymentMethod, status: tx.paymentStatus, amount: Number(tx.amount), reference: tx.gatewayTransactionId || tx.referenceNumber, gateway: tx.gatewayName } : null,
  };
}

export async function listBookings(f: BookingFilters) {
  const pageSize = Math.min(Math.max(f.pageSize || 25, 5), 5000);
  const page = Math.max(f.page || 1, 1);
  const where = bookingWhere(f);
  const [total, rows, grouped] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({ where, select: listSelect, orderBy: f.dateField === "created" ? { createdAt: "desc" } : { pickupDateTime: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    f.withStatusCounts ? prisma.booking.groupBy({ by: ["status"], where: bookingWhere({ ...f, status: undefined }), _count: { _all: true } }) : Promise.resolve(null),
  ]);
  const statusCounts = grouped ? Object.fromEntries(grouped.map(g => [g.status, g._count._all])) as Record<string, number> : undefined;
  return { rows: rows.map(serializeRow), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), ...(statusCounts ? { statusCounts } : {}) };
}

export async function bookingFilterOptions() {
  const [vendors, corporates, vehicles, drivers] = await Promise.all([
    prisma.vendor.findMany({ where: { deletedAt: null }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" }, take: 500 }),
    prisma.corporate.findMany({ where: { deletedAt: null }, select: { id: true, companyName: true }, orderBy: { companyName: "asc" }, take: 500 }),
    prisma.vehicle.findMany({ where: { deletedAt: null }, select: { id: true, registrationNumber: true, make: true, model: true }, orderBy: { registrationNumber: "asc" }, take: 1000 }),
    prisma.driver.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true }, orderBy: { firstName: "asc" }, take: 1000 }),
  ]);
  return {
    vendors: vendors.map(v => ({ id: v.id, label: v.companyName })),
    corporates: corporates.map(c => ({ id: c.id, label: c.companyName })),
    vehicles: vehicles.map(v => ({ id: v.id, label: `${v.registrationNumber} · ${v.make} ${v.model}` })),
    drivers: drivers.map(d => ({ id: d.id, label: `${d.firstName} ${d.lastName}`.trim() })),
  };
}

// ---------- Detail ----------

export async function bookingDetail(id: string) {
  const b = await prisma.booking.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, deletedAt: true, user: { select: { id: true, email: true, mobile: true, role: true, isActive: true } } } },
      corporate: { select: { id: true, companyName: true, status: true } },
      vendor: { select: { id: true, companyName: true, isApproved: true, verifiedAt: true, suspendedAt: true, user: { select: { name: true, email: true, mobile: true } } } },
      vehicle: { select: { id: true, make: true, model: true, variant: true, registrationNumber: true, category: true, seatingCapacity: true, status: true } },
      driver: { select: { id: true, firstName: true, lastName: true, status: true, user: { select: { mobile: true } } } },
      pricingPackage: { select: { id: true, packageName: true, packageType: true } },
      transactions: { orderBy: { createdAt: "asc" }, select: { id: true, transactionType: true, paymentMethod: true, paymentStatus: true, amount: true, referenceNumber: true, gatewayName: true, gatewayTransactionId: true, remarks: true, processedAt: true, createdAt: true } },
      statusHistory: { orderBy: { changedAt: "asc" }, select: { id: true, previousStatus: true, currentStatus: true, action: true, changedBy: true, remarks: true, changedAt: true } },
      trip: { select: { status: true, arrivedPickupAt: true, tripStartedAt: true, tripCompletedAt: true, cancelledAt: true } },
      invoice: { select: { invoiceNumber: true, totalAmount: true, paymentStatus: true } },
    },
  });
  if (!b) throw new BookingAdminError(404, "Booking not found.");
  const [employee, approval, auditRows, events] = await Promise.all([
    b.corporateId ? prisma.corporateEmployee.findFirst({ where: { userId: b.customer.user.id, corporateId: b.corporateId }, select: { id: true, employeeName: true, employeeCode: true, designation: true, department: { select: { departmentName: true } }, branch: { select: { branchName: true } } } }) : null,
    b.corporateId ? prisma.corporateApprovalRequest.findFirst({ where: { bookingId: b.id }, select: { id: true, status: true, amount: true, createdAt: true, updatedAt: true } }) : null,
    prisma.auditLog.findMany({ where: { entityName: "Booking", entityId: b.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, action: true, oldValue: true, newValue: true, createdAt: true, user: { select: { name: true, role: true } } } }),
    prisma.rideGridEvent.findMany({ where: { bookingId: b.id }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, eventType: true, status: true, errorMessage: true, createdAt: true } }),
  ]);
  const actorIds = [...new Set(b.statusHistory.map(h => h.changedBy).filter((v): v is string => !!v))];
  const actors = actorIds.length ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true, role: true } }) : [];
  const actorName = new Map(actors.map(a => [a.id, `${a.name} (${a.role.replaceAll("_", " ").toLowerCase()})`]));
  return {
    id: b.id, bookingNumber: b.bookingNumber, source: b.bookingSource, sourceLabel: sourceLabel(b), status: b.status,
    tripType: b.tripType, tripDays: b.tripDays, pickupLocation: b.pickupLocation, dropLocation: b.dropLocation,
    pickupDateTime: b.pickupDateTime, reservedFrom: b.reservedFrom, reservedUntil: b.reservedUntil,
    holdExpiresAt: b.holdExpiresAt, createdAt: b.createdAt, updatedAt: b.updatedAt, archivedAt: b.deletedAt,
    customer: { id: b.customer.id, name: `${b.customer.firstName} ${b.customer.lastName}`.trim(), email: b.customer.user.email, mobile: b.customer.user.mobile, role: b.customer.user.role, active: b.customer.user.isActive && !b.customer.deletedAt },
    corporate: b.corporate, employee, approval,
    vendor: { id: b.vendor.id, companyName: b.vendor.companyName, contact: b.vendor.user.name, email: b.vendor.user.email, mobile: b.vendor.user.mobile, verified: b.vendor.isApproved && !!b.vendor.verifiedAt, suspended: !!b.vendor.suspendedAt },
    vehicle: b.vehicle,
    driver: b.driver ? { id: b.driver.id, name: `${b.driver.firstName} ${b.driver.lastName}`.trim(), status: b.driver.status, mobile: b.driver.user?.mobile ?? null } : null,
    pricingPackage: b.pricingPackage,
    fare: {
      // Legacy bookings predate pricing snapshots; their fee/revenue split is unknown, not zero.
      snapshotAvailable: !!b.priceSnapshot && typeof b.priceSnapshot === "object" && "platformFee" in (b.priceSnapshot as object),
      vendorFare: b.baseFare == null ? null : Number(b.baseFare),
      platformFee: snapshotNumber(b.priceSnapshot, "platformFee"),
      gst: b.taxAmount == null ? null : Number(b.taxAmount),
      passThrough: b.extraCharges == null ? null : Number(b.extraCharges),
      discount: b.discountAmount == null ? null : Number(b.discountAmount),
      total: Number(b.finalFare ?? b.estimatedFare),
      vendorAmount: b.vendorEarning == null ? null : Number(b.vendorEarning),
      rideGridRevenue: snapshotNumber(b.priceSnapshot, "rideGridRevenue"),
      taxComponents: (b.priceSnapshot as { taxComponents?: unknown } | null)?.taxComponents ?? null,
    },
    cancellation: b.status === BookingStatus.CANCELLED ? { reason: b.cancelReason, cancelledAt: b.cancelledAt, cancelledBy: b.cancelledBy ? actorName.get(b.cancelledBy) ?? b.cancelledBy : null, charge: b.cancellationCharge == null ? null : Number(b.cancellationCharge), refundAmount: b.refundAmount == null ? null : Number(b.refundAmount) } : null,
    transactions: b.transactions.map(t => ({ ...t, amount: Number(t.amount) })),
    statusHistory: b.statusHistory.map(h => ({ ...h, changedBy: h.changedBy ? actorName.get(h.changedBy) ?? "System" : "System" })),
    trip: b.trip, invoice: b.invoice ? { ...b.invoice, totalAmount: Number(b.invoice.totalAmount) } : null,
    audit: auditRows, events,
    allowed: {
      edit: !TERMINAL.includes(b.status) && b.status !== BookingStatus.TRIP_STARTED && !b.deletedAt,
      cancel: !TERMINAL.includes(b.status) && b.status !== BookingStatus.TRIP_STARTED && !b.deletedAt,
      archive: TERMINAL.includes(b.status) && !b.deletedAt,
      restore: !!b.deletedAt,
    },
  };
}

export async function editOptions(id: string) {
  const b = await prisma.booking.findUnique({ where: { id }, select: { vendorId: true } });
  if (!b) throw new BookingAdminError(404, "Booking not found.");
  const drivers = await prisma.driver.findMany({
    where: { deletedAt: null, status: DriverStatus.ACTIVE, user: { isActive: true, deletedAt: null }, vehicles: { some: { vendorId: b.vendorId, deletedAt: null } } },
    select: { id: true, firstName: true, lastName: true, user: { select: { mobile: true } } }, orderBy: { firstName: "asc" },
  });
  return { drivers: drivers.map(d => ({ id: d.id, label: `${d.firstName} ${d.lastName}`.trim(), mobile: d.user?.mobile ?? null })) };
}

// ---------- Controlled edit ----------

export type BookingUpdate = { pickupLocation?: string; dropLocation?: string; pickupDateTime?: string; driverId?: string | null; reason?: string };

// Allowed corrections: pickup/drop text, driver reassignment within the vendor, and
// pickup time on the same calendar reservation window. Anything that would change
// the fare, vehicle or vendor requires cancel + rebook so payments stay consistent.
export async function updateBooking(id: string, input: BookingUpdate, actorId: string) {
  const reason = input.reason?.trim();
  if (!reason) throw new BookingAdminError(400, "A reason for the change is required.");
  const result = await prisma.$transaction(async tx => {
    const b = await tx.booking.findUnique({ where: { id }, select: { id: true, bookingNumber: true, status: true, deletedAt: true, vendorId: true, vehicleId: true, driverId: true, pickupLocation: true, dropLocation: true, pickupDateTime: true, reservedFrom: true, reservedUntil: true, tripDays: true } });
    if (!b) throw new BookingAdminError(404, "Booking not found.");
    if (b.deletedAt) throw new BookingAdminError(409, "Archived bookings cannot be edited.");
    if (TERMINAL.includes(b.status) || b.status === BookingStatus.TRIP_STARTED) throw new BookingAdminError(409, `A ${b.status.replaceAll("_", " ").toLowerCase()} booking cannot be edited.`);
    const data: Prisma.BookingUncheckedUpdateInput = {};
    const before: Record<string, unknown> = {}, after: Record<string, unknown> = {};
    if (input.pickupLocation !== undefined) {
      const v = input.pickupLocation.trim();
      if (!v || v.length > 500) throw new BookingAdminError(400, "Pickup location is required.");
      if (v !== b.pickupLocation) { data.pickupLocation = v; before.pickupLocation = b.pickupLocation; after.pickupLocation = v; }
    }
    if (input.dropLocation !== undefined) {
      const v = input.dropLocation.trim();
      if (!v || v.length > 500) throw new BookingAdminError(400, "Drop location is required.");
      if (v !== b.dropLocation) { data.dropLocation = v; before.dropLocation = b.dropLocation; after.dropLocation = v; }
    }
    let pickup = b.pickupDateTime;
    if (input.pickupDateTime !== undefined) {
      const next = new Date(input.pickupDateTime);
      if (Number.isNaN(next.getTime()) || next.getTime() <= Date.now()) throw new BookingAdminError(400, "Pickup time must be in the future.");
      if (next.getTime() !== b.pickupDateTime.getTime()) {
        const window = reservationWindowFromPickup(next, b.tripDays);
        if (b.reservedFrom && window.start.getTime() !== b.reservedFrom.getTime())
          throw new BookingAdminError(409, "Moving the pickup to a different date changes availability and pricing. Cancel and rebook instead.");
        pickup = next; data.pickupDateTime = next; before.pickupDateTime = b.pickupDateTime; after.pickupDateTime = next;
      }
    }
    let driverChanged = false;
    if (input.driverId !== undefined && (input.driverId || null) !== b.driverId) {
      if (!input.driverId) throw new BookingAdminError(400, "A marketplace booking must keep an assigned driver.");
      const driver = await tx.driver.findFirst({ where: { id: input.driverId, deletedAt: null, status: DriverStatus.ACTIVE, user: { isActive: true, deletedAt: null }, vehicles: { some: { vendorId: b.vendorId, deletedAt: null } } }, select: { id: true } });
      if (!driver) throw new BookingAdminError(409, "Driver must be active and belong to this booking's vendor.");
      const window = reservationWindowFromPickup(pickup, b.tripDays);
      const conflict = await findBookingConflict(tx, { driverId: driver.id, window, excludeBookingId: b.id });
      if (conflict) throw new BookingAdminError(409, `Driver is already booked on ${conflict.booking.bookingNumber} for these dates.`);
      data.driverId = driver.id; before.driverId = b.driverId; after.driverId = driver.id; driverChanged = true;
      await tx.trip.updateMany({ where: { bookingId: b.id, deletedAt: null }, data: { driverId: driver.id } });
    }
    if (!Object.keys(data).length) throw new BookingAdminError(400, "No changes to save.");
    await tx.booking.update({ where: { id: b.id }, data });
    await tx.bookingStatusHistory.create({ data: { bookingId: b.id, previousStatus: b.status, currentStatus: b.status, action: driverChanged ? BookingStatusAction.REASSIGNED : BookingStatusAction.STATUS_CHANGED, changedBy: actorId, remarks: `Admin correction: ${reason}` } });
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Booking", entityId: b.id, oldValue: before, newValue: { ...after, reason } });
    if (driverChanged) await notifyAssignedDriver(tx, b.id, "Trip assigned to you");
    return { id: b.id, bookingNumber: b.bookingNumber, driverChanged };
  }, { isolationLevel: "Serializable" });
  if (result.driverChanged) { await pushAssignedDriver(result.id, "Trip assigned to you"); await emit(AutomationTrigger.DRIVER_ASSIGNED, result.id, actorId); }
  return result;
}

// ---------- Cancellation ----------

export async function cancelBooking(id: string, actorId: string, reasonInput: string) {
  const reason = reasonInput?.trim();
  if (!reason) throw new BookingAdminError(400, "A cancellation reason is required.");
  const result = await prisma.$transaction(async tx => {
    const b = await tx.booking.findUnique({
      where: { id },
      select: { id: true, bookingNumber: true, status: true, deletedAt: true, corporateId: true, vendorId: true, finalFare: true, estimatedFare: true,
        transactions: { where: { transactionType: TransactionType.BOOKING_PAYMENT }, select: { id: true, paymentMethod: true, paymentStatus: true, amount: true } } },
    });
    if (!b) throw new BookingAdminError(404, "Booking not found.");
    if (b.deletedAt) throw new BookingAdminError(409, "Archived bookings cannot be cancelled.");
    if (TERMINAL.includes(b.status)) throw new BookingAdminError(409, `Booking is already ${b.status.replaceAll("_", " ").toLowerCase()}.`);
    if (b.status === BookingStatus.TRIP_STARTED) throw new BookingAdminError(409, "The trip is in progress. Complete or resolve it operationally before cancelling.");
    // Claim the cancellation atomically so concurrent cancels/payments cannot both win.
    const claim = await tx.booking.updateMany({
      where: { id: b.id, status: b.status },
      data: { status: BookingStatus.CANCELLED, cancelReason: reason, cancelledBy: actorId, cancelledAt: new Date(), holdExpiresAt: null, cancellationCharge: 0 },
    });
    if (claim.count !== 1) throw new BookingAdminError(409, "Booking changed while cancelling. Refresh and retry.");
    const paid = b.transactions.filter(t => t.paymentStatus === PaymentStatus.PAID);
    const pending = b.transactions.filter(t => t.paymentStatus === PaymentStatus.PENDING);
    let refundState: "NONE" | "CORPORATE_CREDIT_RESTORED" | "REFUND_DUE" = "NONE";
    let refundAmount = 0;
    // Unpaid attempts become void; they are not receivables once cancelled.
    for (const t of pending)
      await tx.transaction.update({ where: { id: t.id }, data: { paymentStatus: PaymentStatus.FAILED, remarks: "Booking cancelled before payment was completed." } });
    for (const t of paid) {
      const amount = Number(t.amount);
      refundAmount += amount;
      if (t.paymentMethod === PaymentMethod.CORPORATE_CREDIT && b.corporateId) {
        // Restore the corporate credit that the booking consumed.
        const wallet = await tx.corporateWallet.findUnique({ where: { corporateId: b.corporateId } });
        if (wallet) {
          const before = Number(wallet.balance), afterBalance = Math.max(0, before - amount);
          await tx.corporateWallet.update({ where: { id: wallet.id }, data: { balance: afterBalance } });
          await tx.corporateWalletTransaction.create({ data: { walletId: wallet.id, transactionType: WalletTransactionType.CREDIT, amount, balanceBefore: before, balanceAfter: afterBalance, referenceId: b.id, referenceType: "BOOKING_CANCELLATION", description: `Credit restored: ${b.bookingNumber} cancelled` } });
        }
        await tx.transaction.create({ data: { bookingId: b.id, vendorId: b.vendorId, transactionType: TransactionType.REFUND, paymentMethod: PaymentMethod.CORPORATE_CREDIT, paymentStatus: PaymentStatus.PAID, amount, referenceNumber: `CORP-REFUND-${b.bookingNumber}`, gatewayName: "CORPORATE_CREDIT", remarks: "Corporate credit restored on cancellation.", processedAt: new Date() } });
        refundState = "CORPORATE_CREDIT_RESTORED";
      } else {
        // Online (PayU) money must be returned through the gateway. Record the refund
        // as due - it is not marked paid until the gateway refund is confirmed.
        await tx.transaction.create({ data: { bookingId: b.id, vendorId: b.vendorId, transactionType: TransactionType.REFUND, paymentMethod: t.paymentMethod, paymentStatus: PaymentStatus.PENDING, amount, referenceNumber: `REFUND-${b.bookingNumber}`, gatewayName: t.paymentMethod === PaymentMethod.CASH ? "CASH" : "PAYU", remarks: "Refund due after admin cancellation. Process via the payment gateway and reconcile." } });
        refundState = "REFUND_DUE";
      }
    }
    if (refundState === "CORPORATE_CREDIT_RESTORED") await tx.booking.update({ where: { id: b.id }, data: { refundAmount } });
    await tx.bookingStatusHistory.create({ data: { bookingId: b.id, previousStatus: b.status, currentStatus: BookingStatus.CANCELLED, action: BookingStatusAction.CANCELLED, changedBy: actorId, remarks: reason } });
    await tx.trip.updateMany({ where: { bookingId: b.id, deletedAt: null }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await notifyAssignedDriver(tx, b.id, "Booking cancelled");
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Booking", entityId: b.id, oldValue: { status: b.status }, newValue: { status: BookingStatus.CANCELLED, reason, refundState, refundAmount } });
    return { id: b.id, bookingNumber: b.bookingNumber, refundState, refundAmount };
  }, { isolationLevel: "Serializable" });
  await pushAssignedDriver(result.id, "Booking cancelled");
  await emit(AutomationTrigger.BOOKING_CANCELLED, result.id, actorId, { refundState: result.refundState });
  if (result.refundState === "REFUND_DUE")
    await emit(AutomationTrigger.REFUND_DUE, result.id, actorId, { refundAmount: result.refundAmount });
  return result;
}

// ---------- Archive (soft delete) ----------

export async function setArchived(id: string, archived: boolean, actorId: string, reason?: string) {
  const b = await prisma.booking.findUnique({ where: { id }, select: { id: true, status: true, deletedAt: true, bookingNumber: true } });
  if (!b) throw new BookingAdminError(404, "Booking not found.");
  if (archived && !TERMINAL.includes(b.status)) throw new BookingAdminError(409, "Only cancelled or completed bookings can be archived. Cancel the booking first.");
  if (archived === !!b.deletedAt) return { id: b.id, archived };
  await prisma.$transaction(async tx => {
    await tx.booking.update({ where: { id: b.id }, data: { deletedAt: archived ? new Date() : null } });
    await audit(tx, { actorId, action: archived ? AuditAction.DELETE : AuditAction.UPDATE, entityName: "Booking", entityId: b.id, newValue: { event: archived ? "ARCHIVED" : "RESTORED", reason: reason || null } });
  });
  return { id: b.id, archived };
}

// Post-commit event for automation (notifications) and the booking timeline.
async function emit(type: AutomationTrigger, bookingId: string, actorId: string, metadata: Record<string, unknown> = {}) {
  try {
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { bookingNumber: true, customerId: true, vendorId: true, driverId: true, customer: { select: { userId: true } } } });
    if (!b) return;
    await emitRideGridEvent({ type, module: type === AutomationTrigger.REFUND_DUE ? "FINANCE" : "BOOKING", bookingId, userId: b.customer.userId, customerId: b.customerId, vendorId: b.vendorId, driverId: b.driverId ?? undefined, metadata: { ...metadata, bookingNumber: b.bookingNumber, actorId } });
  } catch {
    console.error(`Booking ${bookingId}: ${type} event could not be emitted.`);
  }
}
