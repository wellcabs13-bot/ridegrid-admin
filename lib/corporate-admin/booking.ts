import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { employeeSelect, EmployeeAccess, PortalGuest } from "@/lib/corporate-employee-mobile/access";
import { readEmployee } from "@/lib/corporate-employee-mobile/read";
import { writeEmployee } from "@/lib/corporate-employee-mobile/write";
import { bookingSelect, safeFare } from "@/lib/corporate-employee-mobile/selects";
import { emailReady, pushReady } from "@/lib/notifications/channels";
import { emailProvider, logEmailResult, EmailResult } from "@/lib/notifications/email";
import { normalizeMobile } from "@/lib/auth/identity";
import { ApprovalRequestSnapshot } from "@/lib/services/corporate/CorporateApprovalService";
import { AdminAccess, auditEntry, CorporateAdminError } from "./access";
import { approvalBehaviours } from "./approval-rule";

// The Corporate Admin Portal's booking workspace is not a second booking engine. It reuses the exact
// search / quote / policy / approval / book pipeline built for the Corporate Employee app, entered
// either as the traveller (an employee of the company) or - for a guest with no RideGrid account - through
// the administrator's own profile with a company-default policy. Payment is always Corporate Credit.
//
//   SELF      no traveller supplied: the administrator's own profile (original behaviour)
//   EMPLOYEE  quotes, policy, limits and booking ownership are the employee's, so the ride appears in their
//             Corporate Employee App; the administrator is recorded as the person who booked it
//   GUEST     the booking is owned by the administrator's Customer profile; the guest's details are kept in
//             CorporateBookingTraveller and the ride is evaluated against the company default policy
type Body = Record<string, unknown>;
type Traveller = { kind: "SELF" } | { kind: "EMPLOYEE"; employeeId: string } | { kind: "GUEST"; guest: PortalGuest };

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,}$/;

function clean(value: unknown, name: string, max: number, required: boolean) {
  if (value === undefined || value === null || value === "") {
    if (required) throw new CorporateAdminError(400, `Enter the guest's ${name}.`);
    return null;
  }
  if (typeof value !== "string" || value.trim().length > max) throw new CorporateAdminError(400, `Invalid guest ${name}.`);
  return value.trim() || null;
}

export function parseGuest(value: unknown): PortalGuest {
  const g = value && typeof value === "object" ? (value as Body) : {};
  const name = clean(g.name, "full name", 120, true)!;
  if (name.length < 2) throw new CorporateAdminError(400, "Enter the guest's full name.");
  const mobile = normalizeMobile(clean(g.mobile, "mobile number", 20, true));
  if (!mobile || !(/^[6-9]\d{9}$/.test(mobile) || /^\+\d{8,15}$/.test(mobile))) throw new CorporateAdminError(400, "Enter a valid guest mobile number.");
  const email = clean(g.email, "email", 160, false)?.toLowerCase() ?? null;
  if (email && !EMAIL.test(email)) throw new CorporateAdminError(400, "Enter a valid guest email address.");
  return { name, mobile, email, reference: clean(g.reference, "reference", 80, false) };
}

export function parseTraveller(value: unknown): Traveller {
  if (value === undefined || value === null) return { kind: "SELF" };
  const t = value && typeof value === "object" ? (value as Body) : null;
  if (!t) throw new CorporateAdminError(400, "Invalid traveller.");
  if (t.kind === "EMPLOYEE") {
    if (typeof t.employeeId !== "string" || !t.employeeId || t.employeeId.length > 60) throw new CorporateAdminError(400, "Choose an employee.");
    return { kind: "EMPLOYEE", employeeId: t.employeeId };
  }
  if (t.kind === "GUEST") return { kind: "GUEST", guest: parseGuest(t.guest) };
  if (t.kind === "SELF") return { kind: "SELF" };
  throw new CorporateAdminError(400, "Invalid traveller.");
}

async function ownProfile(a: AdminAccess) {
  const employee = await prisma.corporateEmployee.findFirst({ where: { id: a.adminEmployeeId, corporateId: a.corporateId }, select: employeeSelect });
  if (!employee || !employee.isActive || !employee.userId)
    throw new CorporateAdminError(403, "Your traveller profile is inactive. Contact RideGrid support.");
  return employee as EmployeeAccess["employee"];
}

function portalOf(a: AdminAccess, traveller: Traveller, notifications: () => Prisma.InputJsonValue | undefined): EmployeeAccess["portal"] {
  return {
    actor: { id: a.user.id, name: a.user.name },
    ...(traveller.kind === "GUEST" ? { guest: traveller.guest } : {}),
    onBooked: async (tx, bookingId, approvalBasis) => {
      await tx.corporateBookingTraveller.create({
        data: {
          bookingId, corporateId: a.corporateId, kind: traveller.kind === "GUEST" ? "GUEST" : "EMPLOYEE",
          employeeId: traveller.kind === "EMPLOYEE" ? traveller.employeeId : a.adminEmployeeId,
          ...(traveller.kind === "GUEST" ? { guestName: traveller.guest.name, guestMobile: traveller.guest.mobile, guestEmail: traveller.guest.email, guestReference: traveller.guest.reference } : {}),
          bookedByUserId: a.user.id, bookedByName: a.user.name, approvalBasis, notifications: notifications(),
        },
      });
      await auditEntry(tx, a, "CREATE", "Booking", bookingId, null, { event: traveller.kind === "GUEST" ? "PORTAL_GUEST_BOOKING" : "PORTAL_EMPLOYEE_BOOKING", approvalBasis, ...(traveller.kind === "EMPLOYEE" ? { employeeId: traveller.employeeId } : {}) });
    },
  };
}

async function accessFor(a: AdminAccess, traveller: Traveller): Promise<EmployeeAccess> {
  const own = await ownProfile(a);
  if (traveller.kind === "SELF") return { user: a.user, employee: own };
  if (traveller.kind === "GUEST") {
    // Guests have no employee profile: company default policy, no personal limits, no branch/department scope.
    return {
      user: a.user, portal: portalOf(a, traveller, () => undefined),
      employee: { ...own, travelPolicyId: null, branchId: null, departmentId: null, monthlyTravelLimit: null, yearlyTravelLimit: null },
    };
  }
  const employee = await prisma.corporateEmployee.findFirst({ where: { id: traveller.employeeId, corporateId: a.corporateId }, select: employeeSelect });
  if (!employee) throw new CorporateAdminError(404, "Employee not found in your company.");
  if (!employee.isActive) throw new CorporateAdminError(409, "This employee is inactive and cannot be booked for.");
  if (!employee.userId) throw new CorporateAdminError(409, `${employee.employeeName} has no Corporate Employee App login yet. Create it from their profile so the ride appears in their app.`);
  return {
    user: { id: employee.userId, name: employee.employeeName }, employee: employee as EmployeeAccess["employee"],
    portal: portalOf(a, traveller, () => ({ employee: { inApp: "AUTOMATION", email: emailReady() ? "AUTOMATION" : "NOT_CONFIGURED", push: pushReady() ? "AUTOMATION" : "NOT_CONFIGURED", sms: "NOT_CONNECTED", whatsapp: "NOT_CONNECTED" } })),
  };
}

const READ_SECTIONS: Record<string, string> = { "booking-search": "search", "booking-config": "config" };
const OWN_READS = ["booking-travellers", "booking-confirmation"];
const WRITE_SECTIONS: Record<string, string> = { "booking-quote": "quote", "booking-book": "book", "booking-approval": "approvals" };
const OWN_WRITES = ["booking-complete"];

export const isAdminBookingReadSection = (section: string) => section in READ_SECTIONS || OWN_READS.includes(section);
export const isAdminBookingWriteSection = (section: string) => section in WRITE_SECTIONS || OWN_WRITES.includes(section);

// ---------- Reads ----------

async function travellers(request: NextRequest, a: AdminAccess) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const where: Prisma.CorporateEmployeeWhereInput = {
    corporateId: a.corporateId, isActive: true,
    ...(q ? { OR: [
      { employeeName: { contains: q, mode: "insensitive" } }, { officialEmail: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q.replace(/\s+/g, "") } }, { employeeCode: { contains: q, mode: "insensitive" } },
      { department: { departmentName: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };
  const rows = await prisma.corporateEmployee.findMany({
    where, orderBy: { employeeName: "asc" }, take: 20,
    select: { id: true, employeeName: true, employeeCode: true, officialEmail: true, mobile: true, designation: true, canBook: true, userId: true, travelPolicyId: true, branchId: true, departmentId: true,
      branch: { select: { branchName: true } }, department: { select: { departmentName: true } } },
  });
  const behaviour = await approvalBehaviours(a.corporateId, rows);
  return {
    items: rows.map((e) => ({
      id: e.id, name: e.employeeName, code: e.employeeCode, email: e.officialEmail, mobile: e.mobile, designation: e.designation,
      branch: e.branch?.branchName ?? null, department: e.department?.departmentName ?? null,
      canBook: e.canBook !== false, hasLogin: !!e.userId, approval: behaviour.get(e.id) ?? null,
    })),
  };
}

export async function adminBookingRead(request: NextRequest, section: string, a: AdminAccess) {
  if (section === "booking-travellers") return travellers(request, a);
  if (section === "booking-confirmation") return confirmation(a, request.nextUrl.searchParams.get("id") ?? "");
  const p = request.nextUrl.searchParams;
  const traveller: Traveller = p.get("guest") === "1" ? { kind: "GUEST", guest: { name: "Guest", mobile: "0000000000", email: null, reference: null } }
    : p.get("employeeId") ? { kind: "EMPLOYEE", employeeId: p.get("employeeId")! } : { kind: "SELF" };
  return readEmployee(request, READ_SECTIONS[section], await accessFor(a, traveller));
}

const confirmSelect = {
  ...bookingSelect, corporateId: true, priceSnapshot: true,
  vehicle: { select: { make: true, model: true, category: true, registrationNumber: true, seatingCapacity: true, fuelType: true, transmission: true } },
  corporateTraveller: true,
  customer: { select: { firstName: true, lastName: true, user: { select: { corporateEmployee: { select: { id: true, employeeName: true, employeeCode: true, officialEmail: true, mobile: true, designation: true, department: { select: { departmentName: true } } } } } } } },
} satisfies Prisma.BookingSelect;

async function confirmation(a: AdminAccess, bookingId: string) {
  if (!bookingId) throw new CorporateAdminError(400, "Invalid booking.");
  const b = await prisma.booking.findFirst({ where: { id: bookingId, corporateId: a.corporateId, deletedAt: null }, select: confirmSelect });
  if (!b) throw new CorporateAdminError(404, "Booking not found.");
  const t = b.corporateTraveller;
  const emp = b.customer.user.corporateEmployee;
  const approval = await prisma.corporateApprovalRequest.findFirst({ where: { bookingId: b.id, corporateId: a.corporateId }, select: { id: true, status: true } });
  const fare = safeFare(b.priceSnapshot as Record<string, unknown> | null);
  return {
    id: b.id, bookingNumber: b.bookingNumber, status: b.status, pickupDateTime: b.pickupDateTime, pickupLocation: b.pickupLocation, dropLocation: b.dropLocation,
    traveller: t?.kind === "GUEST"
      ? { kind: "GUEST" as const, name: t.guestName, mobile: t.guestMobile, email: t.guestEmail, reference: t.guestReference }
      : { kind: "EMPLOYEE" as const, name: emp?.employeeName ?? `${b.customer.firstName} ${b.customer.lastName}`.trim(), code: emp?.employeeCode ?? null, email: emp?.officialEmail ?? null, mobile: emp?.mobile ?? null, department: emp?.department?.departmentName ?? null },
    bookedBy: t?.bookedByName ?? null,
    vehicle: b.vehicle, vendor: b.vendor.companyName, driver: b.driver ? { name: `${b.driver.firstName} ${b.driver.lastName}`.trim() } : null,
    fare: { finalPayable: (b.finalFare ?? b.estimatedFare).toFixed(2), taxAmount: fare?.taxAmount ?? null },
    approvalBasis: t?.approvalBasis ?? (approval ? "APPROVAL_GRANTED" : "WITHIN_POLICY"), approval,
    billing: "CORPORATE_CREDIT", notifications: t?.notifications ?? null,
  };
}

// ---------- Guest e-mail ----------

const when = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

async function notifyGuest(bookingId: string, guest: PortalGuest, a: AdminAccess) {
  const status: Record<string, string> = { sms: "NOT_CONNECTED", whatsapp: "NOT_CONNECTED", email: guest.email ? "PENDING" : "NO_ADDRESS" };
  if (guest.email) {
    const b = await prisma.booking.findUnique({ where: { id: bookingId }, select: { bookingNumber: true, status: true, pickupDateTime: true, pickupLocation: true, dropLocation: true, vehicle: { select: { make: true, model: true, registrationNumber: true } }, driver: { select: { firstName: true, lastName: true } }, vendor: { select: { companyName: true } } } });
    if (b) {
      const subject = `Your ride ${b.bookingNumber} is booked`;
      const text = [
        `Hello ${guest.name},`,
        `${a.company.companyName} has booked a ride for you with RideGrid by Wellcabs.`,
        [`Booking: ${b.bookingNumber}`, `Status: ${b.status.replaceAll("_", " ").toLowerCase()}`, `Pickup: ${b.pickupLocation}`, `Drop: ${b.dropLocation}`, `Date and time: ${when(b.pickupDateTime)} (India time)`,
          `Vehicle: ${b.vehicle.make} ${b.vehicle.model} (${b.vehicle.registrationNumber})`, b.driver ? `Driver: ${`${b.driver.firstName} ${b.driver.lastName}`.trim()}` : null, `Operator: ${b.vendor.companyName}`].filter(Boolean).join("\n"),
        "Driver contact details are shared closer to pickup. For help, reply to this email or call +91 90110 79304.",
      ].join("\n\n");
      let result: EmailResult;
      try { result = await emailProvider.send({ to: { address: guest.email, name: guest.name }, subject, text, reference: b.bookingNumber }); }
      catch { result = { status: "FAILED", error: "send failed", retryable: true }; }
      await logEmailResult(guest.email, subject, result);
      status.email = result.status;
    } else status.email = "FAILED";
  }
  await prisma.corporateBookingTraveller.update({ where: { bookingId }, data: { notifications: { guest: status } } }).catch(() => undefined);
  return { guest: status };
}

// ---------- Writes ----------

export async function adminBookingWrite(section: string, raw: Record<string, unknown>, a: AdminAccess) {
  if (section === "booking-complete") return completeApproved(raw, a);
  const { traveller: rawTraveller, ...b } = raw;
  const traveller = parseTraveller(rawTraveller);
  const access = await accessFor(a, traveller);
  const result = await writeEmployee(WRITE_SECTIONS[section], b, access);
  if (section === "booking-book" && traveller.kind !== "SELF" && result && typeof result === "object" && "id" in result) {
    const id = String((result as { id: string }).id);
    const notifications = traveller.kind === "GUEST" ? await notifyGuest(id, traveller.guest, a) : undefined;
    return { ...(result as object), traveller: traveller.kind, ...(notifications ? { notifications } : { notifications: { employee: { inApp: "AUTOMATION", email: emailReady() ? "AUTOMATION" : "NOT_CONFIGURED", push: pushReady() ? "AUTOMATION" : "NOT_CONFIGURED", sms: "NOT_CONNECTED", whatsapp: "NOT_CONNECTED" } } }) };
  }
  return result;
}

// Books an approved request at a fresh quote. Policy, budget and credit are re-checked by the same pipeline.
async function completeApproved(b: Record<string, unknown>, a: AdminAccess) {
  const approvalId = typeof b.approvalId === "string" ? b.approvalId : "";
  const request = await prisma.corporateApprovalRequest.findFirst({ where: { id: approvalId, corporateId: a.corporateId }, select: { id: true, status: true, bookingId: true, employeeId: true, requestSnapshot: true } });
  const snap = request?.requestSnapshot as unknown as ApprovalRequestSnapshot | null;
  if (!request || !snap) throw new CorporateAdminError(404, "Approval request not found.");
  if (request.status !== "APPROVED" || request.bookingId) throw new CorporateAdminError(409, "This request is not waiting to be booked.");
  if (Date.parse(snap.pickupDateTime) <= Date.now()) throw new CorporateAdminError(409, "The requested pickup time has passed.");
  const traveller: Traveller = snap.portal?.guest ? { kind: "GUEST", guest: snap.portal.guest } : { kind: "EMPLOYEE", employeeId: request.employeeId };
  const access = await accessFor(a, traveller);
  const quote = await writeEmployee("quote", { pricingPackageId: snap.pricingPackageId, at: snap.pickupDateTime, idempotencyKey: `complete-${request.id}`, ...(snap.tripType === "ROUNDTRIP" ? { days: snap.days } : {}) }, access) as { id: string };
  const result = await writeEmployee("book", { quoteId: quote.id, listingId: snap.listingId, pricingPackageId: snap.pricingPackageId, pickupDateTime: snap.pickupDateTime, pickupAddress: snap.pickupAddress, dropAddress: snap.dropAddress, approvalId: request.id }, access);
  const id = String((result as { id: string }).id);
  const notifications = traveller.kind === "GUEST" ? await notifyGuest(id, traveller.guest, a) : undefined;
  return { ...(result as object), ...(notifications ? { notifications } : {}) };
}
