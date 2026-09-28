import { AuditAction, BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Central Super Admin account lifecycle: suspend, reactivate and delete accounts
// without destroying booking/finance/audit history.
//
// Deletion "releases" the person's identity: the unique email/mobile columns are
// replaced by an unroutable tombstone so the same verified email/mobile can register
// a new account later, while every historical Booking/Transaction keeps pointing at
// the archived (soft-deleted) records.

export class AccountLifecycleError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "AccountLifecycleError"; }
}

type Tx = Prisma.TransactionClient;

export const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING, BookingStatus.AWAITING_PAYMENT, BookingStatus.CONFIRMED,
  BookingStatus.DRIVER_ASSIGNED, BookingStatus.TRIP_STARTED,
];

export function tombstoneEmail(id: string) {
  return `deleted+${id}@deleted.ridegrid.invalid`;
}

export function maskEmail(email?: string | null) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}***@${domain ?? ""}`;
}

export function maskMobile(mobile?: string | null) {
  return mobile ? `******${mobile.replace(/\D/g, "").slice(-4)}` : null;
}

export async function audit(tx: Tx | typeof prisma, entry: { actorId: string; action: AuditAction; entityName: string; entityId: string; oldValue?: unknown; newValue?: unknown }) {
  await tx.auditLog.create({
    data: {
      userId: entry.actorId, action: entry.action, entityName: entry.entityName, entityId: entry.entityId,
      oldValue: entry.oldValue === undefined ? undefined : (entry.oldValue as Prisma.InputJsonValue),
      newValue: entry.newValue === undefined ? undefined : (entry.newValue as Prisma.InputJsonValue),
    },
  });
}

// Deactivates login and releases the unique email/mobile of a user.
async function releaseUserIdentity(tx: Tx, userId: string) {
  const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, mobile: true } });
  await tx.user.update({
    where: { id: userId },
    data: { email: tombstoneEmail(userId), mobile: null, isActive: false, deletedAt: new Date() },
  });
  await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  return user;
}

async function setLogin(tx: Tx, userId: string, active: boolean) {
  await tx.user.update({ where: { id: userId }, data: { isActive: active } });
  if (!active) await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}

async function openFutureBookings(where: Prisma.BookingWhereInput) {
  return prisma.booking.findMany({
    where: { ...where, deletedAt: null, status: { in: OPEN_BOOKING_STATUSES }, OR: [{ reservedUntil: { gte: new Date() } }, { reservedUntil: null, pickupDateTime: { gte: new Date() } }] },
    select: { bookingNumber: true }, take: 10,
  });
}

function blockedBy(bookings: { bookingNumber: string }[], what: string) {
  if (bookings.length)
    throw new AccountLifecycleError(409, `${what} has open or upcoming bookings (${bookings.map(b => b.bookingNumber).join(", ")}). Cancel or complete them before deleting.`);
}

// ---------- Retail customers ----------

export async function setCustomerActive(customerId: string, active: boolean, actorId: string, reason?: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null }, select: { id: true, userId: true } });
  if (!customer) throw new AccountLifecycleError(404, "Customer not found.");
  await prisma.$transaction(async tx => {
    await setLogin(tx, customer.userId, active);
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Customer", entityId: customer.id, newValue: { event: active ? "REACTIVATED" : "SUSPENDED", reason: reason || null } });
  });
}

export async function deleteCustomer(customerId: string, actorId: string, reason?: string) {
  const customer = await prisma.customer.findFirst({ where: { id: customerId, deletedAt: null }, select: { id: true, userId: true, user: { select: { role: true } } } });
  if (!customer) throw new AccountLifecycleError(404, "Customer not found.");
  if (customer.user.role !== "CUSTOMER") throw new AccountLifecycleError(409, "This traveller belongs to a corporate account. Remove them as a corporate employee instead.");
  blockedBy(await openFutureBookings({ customerId }), "This customer");
  await prisma.$transaction(async tx => {
    const identity = await releaseUserIdentity(tx, customer.userId);
    await tx.customer.update({ where: { id: customer.id }, data: { deletedAt: new Date() } });
    await audit(tx, { actorId, action: AuditAction.DELETE, entityName: "Customer", entityId: customer.id, oldValue: { email: maskEmail(identity.email), mobile: maskMobile(identity.mobile) }, newValue: { event: "ACCOUNT_DELETED", identityReleased: true, reason: reason || null } });
  });
}

// ---------- Corporate employees ----------

export async function setEmployeeActive(employeeId: string, active: boolean, actorId: string, reason?: string) {
  const employee = await prisma.corporateEmployee.findUnique({ where: { id: employeeId }, select: { id: true, userId: true, officialEmail: true } });
  if (!employee || employee.officialEmail.endsWith("@deleted.ridegrid.invalid")) throw new AccountLifecycleError(404, "Employee not found.");
  await prisma.$transaction(async tx => {
    await tx.corporateEmployee.update({ where: { id: employee.id }, data: { isActive: active } });
    if (employee.userId) await setLogin(tx, employee.userId, active);
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "CorporateEmployee", entityId: employee.id, newValue: { event: active ? "REACTIVATED" : "SUSPENDED", reason: reason || null } });
  });
}

export async function deleteEmployee(employeeId: string, actorId: string, reason?: string) {
  const employee = await prisma.corporateEmployee.findUnique({ where: { id: employeeId }, select: { id: true, userId: true, officialEmail: true, mobile: true, employeeCode: true, corporateId: true } });
  if (!employee || employee.officialEmail.endsWith("@deleted.ridegrid.invalid")) throw new AccountLifecycleError(404, "Employee not found.");
  if (employee.userId) blockedBy(await openFutureBookings({ customer: { userId: employee.userId } }), "This employee");
  const adminCount = employee.userId ? await prisma.user.count({ where: { id: employee.userId, role: "CORPORATE_ADMIN" } }) : 0;
  if (adminCount) {
    const otherAdmins = await prisma.corporateEmployee.count({ where: { corporateId: employee.corporateId, isActive: true, id: { not: employee.id }, user: { role: "CORPORATE_ADMIN", isActive: true, deletedAt: null } } });
    if (!otherAdmins) throw new AccountLifecycleError(409, "This is the company's only active Corporate Admin. Add another admin before deleting.");
  }
  await prisma.$transaction(async tx => {
    await tx.corporateEmployee.update({
      where: { id: employee.id },
      data: { isActive: false, officialEmail: tombstoneEmail(employee.id), employeeCode: `DELETED-${employee.id}`, mobile: "" },
    });
    if (employee.userId) {
      await releaseUserIdentity(tx, employee.userId);
      await tx.customer.updateMany({ where: { userId: employee.userId, deletedAt: null }, data: { deletedAt: new Date() } });
    }
    await audit(tx, { actorId, action: AuditAction.DELETE, entityName: "CorporateEmployee", entityId: employee.id, oldValue: { email: maskEmail(employee.officialEmail), mobile: maskMobile(employee.mobile), employeeCode: employee.employeeCode }, newValue: { event: "ACCOUNT_DELETED", identityReleased: true, reason: reason || null } });
  });
}

// ---------- Vendors ----------

export async function verifyVendor(vendorId: string, verified: boolean, actorId: string, reason?: string) {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null }, select: { id: true, isApproved: true } });
  if (!vendor) throw new AccountLifecycleError(404, "Vendor not found.");
  await prisma.$transaction(async tx => {
    await tx.vendor.update({ where: { id: vendor.id }, data: { isApproved: verified, verifiedAt: verified ? new Date() : null } });
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Vendor", entityId: vendor.id, oldValue: { verified: vendor.isApproved }, newValue: { event: verified ? "VERIFIED" : "VERIFICATION_REVOKED", reason: reason || null } });
  });
}

// Suspension blocks vendor login and removes all its inventory from new marketplace
// searches (the marketplace requires an approved vendor with an active login).
// Existing bookings are left untouched and are returned so the admin can decide.
export async function setVendorSuspended(vendorId: string, suspended: boolean, actorId: string, reason?: string) {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null }, select: { id: true, userId: true } });
  if (!vendor) throw new AccountLifecycleError(404, "Vendor not found.");
  if (suspended && !reason?.trim()) throw new AccountLifecycleError(400, "A suspension reason is required.");
  await prisma.$transaction(async tx => {
    await tx.vendor.update({ where: { id: vendor.id }, data: suspended ? { suspendedAt: new Date(), suspensionReason: reason!.trim() } : { suspendedAt: null, suspensionReason: null } });
    await setLogin(tx, vendor.userId, !suspended);
    await audit(tx, { actorId, action: AuditAction.UPDATE, entityName: "Vendor", entityId: vendor.id, newValue: { event: suspended ? "SUSPENDED" : "REINSTATED", reason: reason || null } });
  });
  return openFutureBookings({ vendorId });
}

export async function deleteVendor(vendorId: string, actorId: string, reason?: string) {
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, deletedAt: null }, select: { id: true, userId: true } });
  if (!vendor) throw new AccountLifecycleError(404, "Vendor not found.");
  blockedBy(await openFutureBookings({ vendorId }), "This vendor");
  await prisma.$transaction(async tx => {
    const identity = await releaseUserIdentity(tx, vendor.userId);
    await tx.vendor.update({ where: { id: vendor.id }, data: { deletedAt: new Date(), isApproved: false } });
    await audit(tx, { actorId, action: AuditAction.DELETE, entityName: "Vendor", entityId: vendor.id, oldValue: { email: maskEmail(identity.email), mobile: maskMobile(identity.mobile) }, newValue: { event: "ACCOUNT_DELETED", identityReleased: true, reason: reason || null } });
  });
}
