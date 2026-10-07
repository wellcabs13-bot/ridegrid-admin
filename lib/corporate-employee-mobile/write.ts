import { BookingSource, PaymentMethod, Prisma, TripType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertQuoteUsable, quoteService, Snapshot } from "@/lib/services/pricing/QuoteService";
import { PricingError, nonnegative } from "@/lib/services/pricing/engine";
import { corporateTravelPolicyService, EVERY_TRIP_APPROVAL_REASON, policyServiceType } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { ApprovalRequestSnapshot, corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { commitMarketplaceBooking, loadBookableListing } from "@/lib/services/booking/MarketplaceBookingService";
import { reservationWindowFromPickup, tripDaysFromSnapshot } from "@/lib/services/marketplace/BookingAvailabilityService";
import { emitRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";
import { assertNoForeignIdentity, CorporateMobileError, EmployeeAccess, policySubject, required } from "./access";
import { paymentMethodFor } from "./read";
import { safeFare } from "./selects";

type Body = Record<string, unknown>;

function optional(value: unknown, name: string, max = 300) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string" || value.length > max) throw new CorporateMobileError(400, `Invalid ${name}.`);
  return value.trim();
}

async function evaluate(a: EmployeeAccess, snapshot: Snapshot) {
  const { results } = await corporateTravelPolicyService.evaluateTrip(
    policySubject(a),
    [{ amount: snapshot.finalPayable, category: snapshot.vehicleCategoryId, serviceType: policyServiceType(snapshot.service), pickupDateTime: new Date(snapshot.tripDateTime), tripType: snapshot.service === "OUTSTATION_ROUND_TRIP" ? "ROUNDTRIP" : "ONEWAY", pickupCity: snapshot.route?.origin || snapshot.route?.city || null }],
  );
  return results[0];
}

// A Corporate Administrator booking through the portal is itself an authorised approver, so a company that only
// asks for "approval on every trip" is satisfied by that booking. Genuine policy violations (limits, budgets,
// categories, hours...) and any workflow that names someone other than the administrator still need a real approval.
async function portalAuthorises(a: EmployeeAccess, snapshot: Snapshot, reasons: string[]) {
  if (!a.portal) return false;
  if (reasons.length !== 1 || reasons[0] !== EVERY_TRIP_APPROVAL_REASON) return false;
  const workflow = await corporateApprovalService.getWorkflow(a.employee.corporateId, Number(snapshot.finalPayable), { id: a.employee.id, branchId: a.employee.branchId, departmentId: a.employee.departmentId });
  return workflow.stages.every((s) => s.approverType === "CORPORATE_ADMIN");
}

// The employee's bookings use their own Customer profile, created on first booking,
// so booking ownership reuses the central customer relation.
async function employeeCustomer(a: EmployeeAccess) {
  const existing = await prisma.customer.findUnique({ where: { userId: a.user.id }, select: { id: true, deletedAt: true } });
  if (existing?.deletedAt) throw new CorporateMobileError(409, "Your traveller profile is unavailable. Contact support.");
  if (existing) return existing.id;
  const [firstName, ...rest] = a.employee.employeeName.trim().split(/\s+/);
  try {
    return (await prisma.customer.create({ data: { userId: a.user.id, firstName: firstName || a.employee.employeeName, lastName: rest.join(" ") || "-" }, select: { id: true } })).id;
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") return (await prisma.customer.findUniqueOrThrow({ where: { userId: a.user.id }, select: { id: true } })).id;
    throw e;
  }
}

// Loads a quote the employee owns and confirms it still describes the requested trip.
async function ownedQuote(a: EmployeeAccess, b: Body) {
  const quoteId = required(b.quoteId, "quote"), listingId = required(b.listingId, "vehicle"), pricingPackageId = required(b.pricingPackageId, "pricing");
  const quote = await prisma.pricingQuote.findUnique({ where: { id: quoteId }, include: { booking: { select: { id: true, bookingNumber: true, status: true, customer: { select: { userId: true } } } } } });
  if (!quote) throw new PricingError("QUOTE_REQUIRED", "Refresh the ride to obtain a new quote.");
  assertQuoteUsable(quote, a.user.id, listingId);
  const snapshot = quote.snapshot as unknown as Snapshot;
  const pickup = new Date(required(b.pickupDateTime, "pickup time"));
  if (snapshot.pricingPackageId !== pricingPackageId || Number.isNaN(pickup.getTime()) || snapshot.tripDateTime !== pickup.toISOString())
    throw new PricingError("QUOTE_MISMATCH", "Trip details changed. Request a new quote.");
  if (pickup.getTime() <= Date.now()) throw new CorporateMobileError(400, "Pickup date and time must be in the future.");
  return { quote, snapshot, quoteId, listingId, pricingPackageId, pickup };
}

const tripTypeOf = (s: Snapshot) => (s.service === "OUTSTATION_ROUND_TRIP" ? TripType.ROUNDTRIP : TripType.ONEWAY);

async function quote(a: EmployeeAccess, b: Body) {
  const at = new Date(required(b.at, "trip date"));
  if (Number.isNaN(at.getTime())) throw new CorporateMobileError(400, "Invalid trip date.");
  const days = b.days === undefined ? undefined : nonnegative(b.days, "Trip days");
  if (days !== undefined && (!Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 365)) throw new CorporateMobileError(400, "Trip days must be a whole number from 1 to 365.");
  const q = await quoteService.forPackage(required(b.pricingPackageId, "pricing"), at, a.user.id, true, required(b.idempotencyKey, "request key", 100), days);
  const policy = await evaluate(a, q.snapshot);
  const portalAuthorised = a.portal && policy.decision === "APPROVAL_REQUIRED" ? await portalAuthorises(a, q.snapshot, policy.reasons) : false;
  return {
    id: q.id, expiresAt: q.expiresAt, vehicleId: q.snapshot.vehicleId, fare: safeFare(q.snapshot as unknown as Record<string, unknown>), policy: { decision: policy.decision, reasons: policy.reasons },
    ...(a.portal ? { portalAuthorised } : {}),
  };
}

async function book(a: EmployeeAccess, b: Body) {
  const { quote: record, snapshot, quoteId, listingId, pricingPackageId, pickup } = await ownedQuote(a, b);
  if (record.booking) {
    if (record.booking.customer.userId !== a.user.id) throw new CorporateMobileError(403, "Account access denied.");
    return { id: record.booking.id, bookingNumber: record.booking.bookingNumber, status: record.booking.status };
  }
  const policy = await evaluate(a, snapshot);
  if (policy.decision === "NOT_ALLOWED") throw new CorporateMobileError(403, policy.blocked[0] || "This ride is not allowed by your company travel policy.", "POLICY_NOT_ALLOWED");
  const approvalId = optional(b.approvalId, "approval", 60);
  let pickupAddress = required(b.pickupAddress, "pickup address", 300), dropAddress = required(b.dropAddress, "drop address", 300);
  const adminAuthorised = policy.decision === "APPROVAL_REQUIRED" && !approvalId && await portalAuthorises(a, snapshot, policy.reasons);
  if (policy.decision === "APPROVAL_REQUIRED" && !approvalId && !adminAuthorised)
    throw new CorporateMobileError(409, "This ride needs company approval. Submit it for approval first.", "APPROVAL_REQUIRED");
  if (approvalId) {
    const approval = await prisma.corporateApprovalRequest.findFirst({ where: { id: approvalId, employeeId: a.employee.id, corporateId: a.employee.corporateId }, select: { status: true, bookingId: true, amount: true, requestSnapshot: true } });
    const approved = approval?.requestSnapshot as unknown as ApprovalRequestSnapshot | undefined;
    if (!approval || !approved) throw new CorporateMobileError(404, "Approval not found.");
    if (approval.status !== "APPROVED" || approval.bookingId) throw new CorporateMobileError(409, "This approval is not available for booking.", "APPROVAL_UNAVAILABLE");
    if (approved.pricingPackageId !== pricingPackageId || approved.pickupDateTime !== pickup.toISOString() || approved.listingId !== listingId)
      throw new CorporateMobileError(409, "The ride differs from the approved request. Submit a new request.", "APPROVAL_MISMATCH");
    if (approval.amount && new Prisma.Decimal(snapshot.finalPayable).gt(approval.amount))
      throw new CorporateMobileError(409, "The current fare is higher than the approved amount. Submit a new request.", "APPROVAL_AMOUNT_EXCEEDED");
    // The approved addresses are part of what the approver decided on.
    pickupAddress = approved.pickupAddress; dropAddress = approved.dropAddress;
  }
  const tripType = tripTypeOf(snapshot);
  const window = reservationWindowFromPickup(pickup, tripType === TripType.ROUNDTRIP ? tripDaysFromSnapshot(snapshot, 1) : 1);
  const { packageData, vehicle } = await loadBookableListing(listingId, pricingPackageId, window);
  const customerId = await employeeCustomer(a);
  const credit = await paymentMethodFor(a.employee.corporateId);
  if (!credit.available)
    throw new CorporateMobileError(409, "Corporate credit is unavailable or insufficient. Please contact your Corporate Administrator.", "CORPORATE_CREDIT_UNAVAILABLE");
  const paymentMethod = PaymentMethod.CORPORATE_CREDIT;
  const discountAmount = new Prisma.Decimal(snapshot.vendorFundedDiscount).plus(snapshot.rideGridFundedDiscount).toNumber();
  const booking = await commitMarketplaceBooking({
    quoteId, ownerId: a.user.id, snapshot, vehicle, pricingPackageId: packageData.id, customerId,
    corporateId: a.employee.corporateId, bookingSource: BookingSource.CORPORATE, tripType,
    pickupAddress, dropAddress, pickupDateTime: pickup, window, discountAmount, finalFare: Number(snapshot.finalPayable),
    paymentMethod, changedBy: a.portal?.actor.id ?? a.user.id,
    afterCreate: approvalId || a.portal
      ? async (tx, created) => {
          if (approvalId) await corporateApprovalService.markBooked(tx, approvalId, a.employee.id, created.id);
          if (a.portal) await a.portal.onBooked(tx, created.id, approvalId ? "APPROVAL_GRANTED" : adminAuthorised ? "ADMIN_AUTHORISED" : "WITHIN_POLICY");
        }
      : undefined,
  });
  // Traveller confirmation and vendor/driver alerts are automation rules on BOOKING_CREATED.
  await emitRideGridEvent({
    type: AutomationTrigger.BOOKING_CREATED, module: "BOOKING", bookingId: booking.id, userId: a.user.id, customerId,
    vendorId: vehicle.vendorId, driverId: vehicle.driverId ?? undefined,
    metadata: { bookingNumber: booking.bookingNumber, source: booking.bookingSource, paymentMethod, corporateId: a.employee.corporateId, ...(a.portal ? { bookedByAdminId: a.portal.actor.id } : {}) },
  });
  return { id: booking.id, bookingNumber: booking.bookingNumber, status: booking.status, paymentMethod, approvalBasis: approvalId ? "APPROVAL_GRANTED" : adminAuthorised ? "ADMIN_AUTHORISED" : "WITHIN_POLICY", policyReasons: policy.reasons };
}

async function requestApproval(a: EmployeeAccess, b: Body) {
  const { snapshot, quoteId, listingId, pricingPackageId, pickup } = await ownedQuote(a, b);
  const policy = await evaluate(a, snapshot);
  if (policy.decision === "NOT_ALLOWED") throw new CorporateMobileError(403, policy.blocked[0] || "This ride is not allowed by your company travel policy.", "POLICY_NOT_ALLOWED");
  if (policy.decision === "ALLOWED" || await portalAuthorises(a, snapshot, policy.reasons)) throw new CorporateMobileError(409, "This ride is within policy. Book it directly.", "APPROVAL_NOT_NEEDED");
  const pkg = await prisma.pricingPackage.findFirst({
    where: { id: pricingPackageId, vehicleId: listingId },
    select: { packageName: true, packageType: true, city: true, fromCity: true, toCity: true, vehicle: { select: { make: true, model: true, category: true, vendor: { select: { companyName: true } } } } },
  });
  if (!pkg) throw new CorporateMobileError(409, "Selected pricing is no longer active.");
  const fare = safeFare(snapshot as unknown as Record<string, unknown>)!;
  const local = policyServiceType(snapshot.service) !== "OUTSTATION";
  const request: ApprovalRequestSnapshot = {
    quoteId, listingId, pricingPackageId, vendorId: snapshot.vendorId,
    serviceType: local ? "LOCAL" : "OUTSTATION", tripType: tripTypeOf(snapshot), days: snapshot.tripMetrics?.days || "1",
    pickupDateTime: pickup.toISOString(),
    pickupAddress: required(b.pickupAddress, "pickup address", 300), dropAddress: required(b.dropAddress, "drop address", 300),
    route: { pickupCity: (local ? pkg.city : pkg.fromCity) || snapshot.route.origin, dropCity: (local ? "" : pkg.toCity) || snapshot.route.destination, packageName: pkg.packageName },
    vehicle: { make: pkg.vehicle.make, model: pkg.vehicle.model, category: pkg.vehicle.category }, vendorName: pkg.vehicle.vendor.companyName,
    fare: { vendorFare: fare.vendorFare, platformFee: fare.platformFee, taxAmount: fare.taxAmount, finalPayable: fare.finalPayable },
    policyReasons: policy.reasons, note: optional(b.note, "note", 500),
    ...(a.portal ? { portal: { bookedBy: a.portal.actor.name, ...(a.portal.guest ? { guest: a.portal.guest } : {}) } } : {}),
  };
  return corporateApprovalService.submit({ corporateId: a.employee.corporateId, employeeId: a.employee.id, userId: a.user.id, amount: new Prisma.Decimal(snapshot.finalPayable), snapshot: request, subject: { id: a.employee.id, branchId: a.employee.branchId, departmentId: a.employee.departmentId } });
}

// Employees without booking permission may still approve or read their records.
function assertCanBook(a: EmployeeAccess) {
  if (a.employee.canBook === false) throw new CorporateMobileError(403, "Your company has not enabled booking for your profile. Contact your travel administrator.", "BOOKING_NOT_PERMITTED");
}

export async function writeEmployee(section: string, b: Body, a: EmployeeAccess) {
  assertNoForeignIdentity(b, a);
  if (["quote", "book"].includes(section) || (section === "approvals" && b.action !== "CANCEL")) assertCanBook(a);
  if (section === "quote") return quote(a, b);
  if (section === "book") return book(a, b);
  if (section === "approvals") {
    if (b.action === "CANCEL") return corporateApprovalService.cancel(required(b.id, "request"), a.employee.id);
    return requestApproval(a, b);
  }
  // A designated approver's decision on the step assigned to them.
  if (section === "approver-decision") {
    const action = b.action;
    if (action !== "APPROVE" && action !== "REJECT") throw new CorporateMobileError(400, "Choose a decision.");
    const remarks = optional(b.remarks, "remarks", 500);
    if (action === "REJECT" && !remarks) throw new CorporateMobileError(400, "Add a reason for rejecting this request.");
    return corporateApprovalService.decide({ requestId: required(b.id, "request"), corporateId: a.employee.corporateId, actorUserId: a.user.id, actorEmployeeId: a.employee.id, action, remarks });
  }
  if (section === "notifications") {
    const result = await prisma.notification.updateMany({ where: { id: required(b.id, "notification"), userId: a.user.id, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }
  throw new CorporateMobileError(405, "This action is unavailable.");
}
