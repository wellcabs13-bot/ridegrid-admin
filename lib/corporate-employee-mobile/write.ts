import { BookingSource, PaymentMethod, Prisma, TripType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertQuoteUsable, quoteService, Snapshot } from "@/lib/services/pricing/QuoteService";
import { PricingError, nonnegative } from "@/lib/services/pricing/engine";
import { corporateTravelPolicyService, policyServiceType } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { ApprovalRequestSnapshot, corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { commitMarketplaceBooking, loadBookableListing } from "@/lib/services/booking/MarketplaceBookingService";
import { reservationWindowFromPickup, tripDaysFromSnapshot } from "@/lib/services/marketplace/BookingAvailabilityService";
import { createRideGridEvent } from "@/lib/events/event-bus";
import { dispatchRideGridEvent } from "@/lib/events/event-dispatcher";
import { AutomationTrigger } from "@/types/automation";
import { assertNoForeignIdentity, CorporateMobileError, EmployeeAccess, required } from "./access";
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
    { corporateId: a.employee.corporateId, userId: a.user.id, monthlyTravelLimit: a.employee.monthlyTravelLimit, yearlyTravelLimit: a.employee.yearlyTravelLimit },
    [{ amount: snapshot.finalPayable, category: snapshot.vehicleCategoryId, serviceType: policyServiceType(snapshot.service), pickupDateTime: new Date(snapshot.tripDateTime) }],
  );
  return results[0];
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
  return { id: q.id, expiresAt: q.expiresAt, vehicleId: q.snapshot.vehicleId, fare: safeFare(q.snapshot as unknown as Record<string, unknown>), policy: { decision: policy.decision, reasons: policy.reasons } };
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
  if (policy.decision === "APPROVAL_REQUIRED" && !approvalId)
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
  const paymentMethod = (await paymentMethodFor(a.employee.corporateId)) === "CORPORATE_CREDIT" ? PaymentMethod.CORPORATE_CREDIT : PaymentMethod.CASH;
  const discountAmount = new Prisma.Decimal(snapshot.vendorFundedDiscount).plus(snapshot.rideGridFundedDiscount).toNumber();
  const booking = await commitMarketplaceBooking({
    quoteId, ownerId: a.user.id, snapshot, vehicle, pricingPackageId: packageData.id, customerId,
    corporateId: a.employee.corporateId, bookingSource: BookingSource.CORPORATE, tripType,
    pickupAddress, dropAddress, pickupDateTime: pickup, window, discountAmount, finalFare: Number(snapshot.finalPayable),
    paymentMethod, changedBy: a.user.id,
    afterCreate: async (tx, created) => {
      if (approvalId) await corporateApprovalService.markBooked(tx, approvalId, a.employee.id, created.id);
      await tx.notification.create({ data: { userId: a.user.id, notificationType: "PUSH", title: "Ride booked", message: `${created.bookingNumber} is confirmed. Open My Trips for details.` } });
    },
  });
  try {
    await dispatchRideGridEvent(createRideGridEvent({
      type: AutomationTrigger.BOOKING_CREATED, module: "BOOKING", bookingId: booking.id, userId: a.user.id, customerId,
      vendorId: vehicle.vendorId, driverId: vehicle.driverId ?? undefined,
      metadata: { bookingNumber: booking.bookingNumber, source: booking.bookingSource, paymentMethod, corporateId: a.employee.corporateId },
    }));
  } catch {
    console.error("Corporate booking saved; booking notification dispatch requires retry.");
  }
  return { id: booking.id, bookingNumber: booking.bookingNumber, status: booking.status, paymentMethod };
}

async function requestApproval(a: EmployeeAccess, b: Body) {
  const { snapshot, quoteId, listingId, pricingPackageId, pickup } = await ownedQuote(a, b);
  const policy = await evaluate(a, snapshot);
  if (policy.decision === "NOT_ALLOWED") throw new CorporateMobileError(403, policy.blocked[0] || "This ride is not allowed by your company travel policy.", "POLICY_NOT_ALLOWED");
  if (policy.decision === "ALLOWED") throw new CorporateMobileError(409, "This ride is within policy. Book it directly.", "APPROVAL_NOT_NEEDED");
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
  };
  return corporateApprovalService.submit({ corporateId: a.employee.corporateId, employeeId: a.employee.id, userId: a.user.id, amount: new Prisma.Decimal(snapshot.finalPayable), snapshot: request });
}

export async function writeEmployee(section: string, b: Body, a: EmployeeAccess) {
  assertNoForeignIdentity(b, a);
  if (section === "quote") return quote(a, b);
  if (section === "book") return book(a, b);
  if (section === "approvals") {
    if (b.action === "CANCEL") return corporateApprovalService.cancel(required(b.id, "request"), a.employee.id);
    return requestApproval(a, b);
  }
  if (section === "notifications") {
    const result = await prisma.notification.updateMany({ where: { id: required(b.id, "notification"), userId: a.user.id, readAt: null }, data: { readAt: new Date() } });
    return { updated: result.count };
  }
  throw new CorporateMobileError(405, "This action is unavailable.");
}
