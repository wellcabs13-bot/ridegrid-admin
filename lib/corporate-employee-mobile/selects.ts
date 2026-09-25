import { Prisma } from "@prisma/client";
import type { ApprovalRequestSnapshot } from "@/lib/services/corporate/CorporateApprovalService";

type FareSource = Record<string, unknown> | null | undefined;

// Employee-facing fare: what they pay and why. Vendor payout, processing cost and
// RideGrid revenue are internal and never leave the server.
export function safeFare(value: FareSource) {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  const text = (key: string) => (typeof s[key] === "string" ? (s[key] as string) : s[key] == null ? "0" : String(s[key]));
  const taxes = Array.isArray(s.taxComponents) ? (s.taxComponents as { name?: unknown; rate?: unknown; amount?: unknown }[]) : [];
  const charges = Array.isArray(s.passThroughCharges) ? (s.passThroughCharges as { name?: unknown; amount?: unknown; included?: unknown }[]) : [];
  return {
    vendorFare: text("vendorFare"), platformFee: text("platformFee"), taxAmount: text("taxAmount"),
    taxComponents: taxes.map((t) => ({ name: String(t.name ?? "Tax"), rate: String(t.rate ?? ""), amount: String(t.amount ?? "0") })),
    passThroughTotal: text("passThroughTotal"),
    passThroughCharges: charges.map((c) => ({ name: String(c.name ?? "Charge"), amount: String(c.amount ?? "0"), included: c.included === true })),
    discount: new Prisma.Decimal(text("vendorFundedDiscount")).plus(text("rideGridFundedDiscount")).toFixed(2),
    finalPayable: text("finalPayable"),
    quoteExpiry: typeof s.quoteExpiry === "string" ? s.quoteExpiry : null,
    tripDateTime: typeof s.tripDateTime === "string" ? s.tripDateTime : null,
    days: typeof (s.tripMetrics as { days?: unknown } | undefined)?.days === "string" ? (s.tripMetrics as { days: string }).days : "1",
  };
}

export const bookingSelect = {
  id: true, bookingNumber: true, status: true, tripType: true, tripDays: true, bookingSource: true,
  pickupLocation: true, dropLocation: true, pickupDateTime: true, finalFare: true, estimatedFare: true, priceSnapshot: true, createdAt: true,
  pricingPackage: { select: { packageType: true, packageName: true, city: true, fromCity: true, toCity: true } },
  vehicle: { select: { make: true, model: true, category: true, registrationNumber: true, seatingCapacity: true } },
  vendor: { select: { companyName: true } },
  driver: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
  transactions: { select: { paymentMethod: true, paymentStatus: true }, orderBy: { createdAt: "desc" as const }, take: 1 },
  trip: { select: { status: true, deletedAt: true } },
} satisfies Prisma.BookingSelect;

type BookingRow = Prisma.BookingGetPayload<{ select: typeof bookingSelect }>;

const LIVE = ["DRIVER_ASSIGNED", "TRIP_STARTED"];

export function serviceOf(b: Pick<BookingRow, "pricingPackage" | "tripType">) {
  const local = b.pricingPackage?.packageType?.startsWith("LOCAL");
  return local ? "LOCAL" : b.tripType === "ROUNDTRIP" ? "ROUNDTRIP" : "ONE_WAY";
}

export function safeBooking(b: BookingRow, approval?: { id: string; status: string } | null) {
  const p = b.pricingPackage;
  const local = p?.packageType?.startsWith("LOCAL");
  return {
    id: b.id, bookingNumber: b.bookingNumber, status: b.status, tripType: b.tripType, tripDays: b.tripDays, service: serviceOf(b),
    pickupLocation: b.pickupLocation, dropLocation: b.dropLocation, pickupDateTime: b.pickupDateTime, createdAt: b.createdAt,
    finalFare: (b.finalFare ?? b.estimatedFare).toFixed(2), fare: safeFare(b.priceSnapshot as FareSource),
    packageName: p?.packageName ?? null,
    vehicle: b.vehicle, vendor: { companyName: b.vendor.companyName },
    // Driver contact follows the Driver App privacy rule: only for a live assignment.
    driver: b.driver ? { name: `${b.driver.firstName} ${b.driver.lastName}`.trim(), mobile: LIVE.includes(b.status) ? b.driver.user.mobile : null } : null,
    payment: b.transactions[0] ? { method: b.transactions[0].paymentMethod, status: b.transactions[0].paymentStatus } : null,
    tripStatus: b.trip && !b.trip.deletedAt ? b.trip.status : null,
    approval: approval ?? null,
    rebook: p ? {
      serviceType: local ? "LOCAL" : "OUTSTATION", tripType: b.tripType === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY",
      pickupCity: (local ? p.city : p.fromCity) || "", dropCity: local ? "" : p.toCity || "",
      category: b.vehicle.category, packageName: local ? p.packageName : "",
    } : null,
  };
}

export const approvalSelect = {
  id: true, status: true, amount: true, currentStage: true, submittedAt: true, completedAt: true, bookingId: true, requestSnapshot: true,
  steps: { select: { level: true, stage: true, status: true, remarks: true, actedAt: true }, orderBy: { level: "asc" as const } },
} satisfies Prisma.CorporateApprovalRequestSelect;

type ApprovalRow = Prisma.CorporateApprovalRequestGetPayload<{ select: typeof approvalSelect }>;

// PENDING or unused APPROVED requests whose pickup time has passed are shown as EXPIRED.
export function approvalStatus(r: Pick<ApprovalRow, "status" | "bookingId" | "requestSnapshot">, now = Date.now()) {
  const s = r.requestSnapshot as unknown as ApprovalRequestSnapshot | null;
  const past = s ? Date.parse(s.pickupDateTime) <= now : false;
  if (r.status === "PENDING" && past) return "EXPIRED";
  if (r.status === "APPROVED" && !r.bookingId && past) return "EXPIRED";
  if (r.status === "APPROVED" && r.bookingId) return "BOOKED";
  return r.status;
}

export function safeApproval(r: ApprovalRow, booking?: { id: string; bookingNumber: string; status: string } | null) {
  const s = r.requestSnapshot as unknown as ApprovalRequestSnapshot | null;
  const decided = r.steps.filter((step) => step.status !== "PENDING");
  return {
    id: r.id, status: approvalStatus(r), rawStatus: r.status, amount: r.amount?.toFixed(2) ?? null, currentStage: r.currentStage,
    submittedAt: r.submittedAt, completedAt: r.completedAt,
    ride: s ? {
      pricingPackageId: s.pricingPackageId, listingId: s.listingId, serviceType: s.serviceType, tripType: s.tripType, days: s.days,
      pickupDateTime: s.pickupDateTime, pickupAddress: s.pickupAddress, dropAddress: s.dropAddress, route: s.route,
      vehicle: s.vehicle, vendorName: s.vendorName, fare: s.fare, policyReasons: s.policyReasons, note: s.note,
    } : null,
    // Approver identity is not exposed; the stage and decision are.
    steps: r.steps.map((step) => ({ level: step.level, stage: step.stage, status: step.status, actedAt: step.actedAt, remarks: step.remarks })),
    decisionNote: decided.map((step) => step.remarks).filter(Boolean).join(" ") || null,
    booking: booking ?? null,
  };
}
