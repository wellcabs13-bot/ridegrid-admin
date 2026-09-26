import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WELLCABS } from "@/lib/website-public/brand";
import { marketplaceListingService } from "@/lib/services/marketplace/MarketplaceListingService";
import { corporateTravelPolicyService, policyCategories } from "@/lib/services/corporate/CorporateTravelPolicyService";
import { corporateApprovalService } from "@/lib/services/corporate/CorporateApprovalService";
import { getCorporateCreditAccount } from "@/lib/services/corporate/CorporateCreditService";
import { trustedTripLocation } from "@/lib/services/booking/TrustedLocationService";
import { CorporateMobileError, EmployeeAccess } from "./access";
import { approvalSelect, bookingSelect, safeApproval, safeBooking, safeFare } from "./selects";

export const ownBookings = (a: EmployeeAccess): Prisma.BookingWhereInput => ({
  corporateId: a.employee.corporateId, deletedAt: null, customer: { userId: a.user.id },
});
const ownApprovals = (a: EmployeeAccess): Prisma.CorporateApprovalRequestWhereInput => ({
  employeeId: a.employee.id, corporateId: a.employee.corporateId,
});

const FILTERS: Record<string, Prisma.BookingWhereInput> = {
  UPCOMING: { status: { in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"] } },
  ACTIVE: { status: "TRIP_STARTED" },
  COMPLETED: { status: "TRIP_COMPLETED" },
  CANCELLED: { status: "CANCELLED" },
};

// Company pays through its corporate credit account when one is configured;
// otherwise the existing marketplace cash-on-pickup behaviour applies.
export async function paymentMethodFor(corporateId: string) {
  const credit = await getCorporateCreditAccount(corporateId).catch(() => null);
  return credit?.enabled && credit.creditLimit > 0 ? "CORPORATE_CREDIT" as const : "CASH" as const;
}

function page(request: NextRequest) {
  const value = Number(request.nextUrl.searchParams.get("page") || 1);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new CorporateMobileError(400, "Invalid page.");
  return value;
}

export function profileOf(a: EmployeeAccess) {
  const e = a.employee;
  return {
    id: e.id, name: e.employeeName, employeeCode: e.employeeCode, email: e.officialEmail, mobile: e.mobile,
    designation: e.designation, grade: e.employeeGrade, managerName: e.managerName, isApprover: e.isApprover,
    status: e.isActive ? "ACTIVE" : "INACTIVE", defaultPickupAddress: e.defaultPickupAddress,
    company: { name: e.corporate.companyName, approvalFlow: e.corporate.approvalFlow, billingCycle: e.corporate.billingCycle },
    branch: e.branch ? { name: e.branch.branchName, city: e.branch.city } : null,
    department: e.department?.departmentName ?? null, costCenter: e.costCenter?.name ?? null,
  };
}

// Only the employee's own limits are exposed. Company budgets remain admin-only.
export async function budgetOf(a: EmployeeAccess) {
  const e = a.employee;
  if (e.monthlyTravelLimit === null && e.yearlyTravelLimit === null) return { visible: false as const };
  const usage = await corporateTravelPolicyService.employeeUsage(e.corporateId, a.user.id);
  const period = (limit: Prisma.Decimal | null, used: Prisma.Decimal.Value, start: Date, end: Date) => limit === null ? null : {
    limit: limit.toFixed(2), used: new Prisma.Decimal(used).toFixed(2),
    remaining: Prisma.Decimal.max(limit.minus(used), 0).toFixed(2), periodStart: start, periodEnd: end,
  };
  return {
    visible: true as const,
    monthly: period(e.monthlyTravelLimit, usage.monthUsed, usage.periods.monthStart, usage.periods.monthEnd),
    yearly: period(e.yearlyTravelLimit, usage.yearUsed, usage.periods.yearStart, usage.periods.yearEnd),
    basis: "Booked, non-cancelled company rides by pickup date (India time).",
  };
}

export async function policyOf(a: EmployeeAccess) {
  const [policy, workflow] = await Promise.all([
    corporateTravelPolicyService.getActivePolicy(a.employee.corporateId),
    corporateApprovalService.getWorkflow(a.employee.corporateId),
  ]);
  return {
    policy: policy ? {
      name: policy.policyName, maxTripAmount: policy.maxTripAmount?.toFixed(2) ?? null,
      allowedCategories: policyCategories(policy), advanceBookingHours: policy.advanceBookingHours,
      nightTravelAllowed: policy.nightTravelAllowed, outstationAllowed: policy.outstationAllowed,
      airportTravelAllowed: policy.airportTravelAllowed, approvalRequired: policy.approvalRequired,
    } : null,
    approvalStages: workflow.stages.map((s) => ({ level: s.level, approver: s.approverDesignation, maxAmount: s.maxAmount })),
    approvalFlow: a.employee.corporate.approvalFlow,
    employeeLimits: {
      monthly: a.employee.monthlyTravelLimit?.toFixed(2) ?? null, yearly: a.employee.yearlyTravelLimit?.toFixed(2) ?? null,
    },
  };
}

async function approvalsForBookings(ids: string[]) {
  if (!ids.length) return new Map<string, { id: string; status: string }>();
  const rows = await prisma.corporateApprovalRequest.findMany({ where: { bookingId: { in: ids } }, select: { id: true, status: true, bookingId: true } });
  return new Map(rows.map((r) => [r.bookingId!, { id: r.id, status: r.status }]));
}

async function search(request: NextRequest, a: EmployeeAccess) {
  const p = request.nextUrl.searchParams;
  const serviceType = p.get("serviceType") || "";
  const tripType = p.get("tripType") || "ONEWAY";
  if (!["LOCAL", "OUTSTATION"].includes(serviceType) || !["ONEWAY", "ROUNDTRIP"].includes(tripType))
    throw new CorporateMobileError(400, "Choose a supported service.");
  const date = p.get("date") || "", time = serviceType === "OUTSTATION" && tripType === "ROUNDTRIP" ? "12:00" : p.get("time") || "";
  const pickup = new Date(`${date}T${time}:00+05:30`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || Number.isNaN(pickup.getTime()) || pickup.getTime() <= Date.now())
    throw new CorporateMobileError(400, "Choose a future pickup date and time.");
  const data = await marketplaceListingService.search({
    serviceType, tripType, pickupCity: p.get("pickupCity") || "", dropCity: p.get("dropCity") || "",
    packageName: p.get("packageName") || "", category: p.get("category") || "", date, time, days: p.get("days") || "1",
    page: page(request), limit: 20,
  });
  const listings = data.listings as {
    id: string; vehicle: Record<string, unknown> & { category: string };
    pricing: { quote: Record<string, unknown> & { finalPayable: string; service: string }; pricingPackageId: string; packageName: string; includedKm: number | null; includedHours: number | null; extraKmRate: number | null; extraHourRate: number | null; driverAllowance: number | null; tripDays: number };
    vendor: { companyName: string } | null; driver: { name: string; verified: boolean } | null;
  }[];
  // Listing policy status is a server preview. The fresh quote is re-evaluated before booking.
  const evaluation = await corporateTravelPolicyService.evaluateTrip(
    { corporateId: a.employee.corporateId, userId: a.user.id, monthlyTravelLimit: a.employee.monthlyTravelLimit, yearlyTravelLimit: a.employee.yearlyTravelLimit },
    listings.map((l) => ({ amount: l.pricing.quote.finalPayable, category: l.vehicle.category, serviceType: serviceType as "LOCAL" | "OUTSTATION", pickupDateTime: pickup })),
  );
  return {
    listings: listings.map((l, i) => ({
      id: l.id,
      vehicle: {
        make: l.vehicle.make, model: l.vehicle.model, variant: l.vehicle.variant ?? null, category: l.vehicle.category,
        seatingCapacity: l.vehicle.seatingCapacity, luggageCapacity: l.vehicle.luggageCapacity ?? null,
        fuelType: l.vehicle.fuelType, transmission: l.vehicle.transmission, registrationNumber: l.vehicle.registrationNumber,
      },
      vendor: l.vendor ? { companyName: l.vendor.companyName } : null,
      driver: l.driver ? { name: l.driver.name, verified: l.driver.verified } : null,
      pricing: {
        pricingPackageId: l.pricing.pricingPackageId, packageName: l.pricing.packageName, tripDays: l.pricing.tripDays,
        includedKm: l.pricing.includedKm, includedHours: l.pricing.includedHours, extraKmRate: l.pricing.extraKmRate,
        extraHourRate: l.pricing.extraHourRate, driverAllowance: l.pricing.driverAllowance, fare: safeFare(l.pricing.quote),
      },
      policy: { decision: evaluation.results[i].decision, reasons: evaluation.results[i].reasons },
    })),
    pagination: data.pagination,
  };
}

export async function readEmployee(request: NextRequest, section: string, a: EmployeeAccess) {
  const id = request.nextUrl.searchParams.get("id");
  if (section === "config") return {
    support: { name: WELLCABS.name, phoneHref: WELLCABS.phoneHref, emailHref: WELLCABS.emailHref, whatsapp: WELLCABS.whatsapp },
    paymentMethod: await paymentMethodFor(a.employee.corporateId),
    services: ["ONE_WAY", "ROUNDTRIP", "LOCAL"], profileEdit: false, pushRegistration: false, rebook: true,
    termsPath: "/terms-and-conditions", privacyPath: "/privacy-policy", cancellationPath: "/cancellation-refund-policy",
  };
  if (section === "profile") return profileOf(a);
  if (section === "policy") return policyOf(a);
  if (section === "budget") return budgetOf(a);
  if (section === "search") return search(request, a);
  if (section === "home") {
    const now = new Date();
    const [upcoming, active, pending, approved, unread, policy, budget] = await Promise.all([
      prisma.booking.findFirst({ where: { ...ownBookings(a), status: { in: ["PENDING", "CONFIRMED", "DRIVER_ASSIGNED"] }, pickupDateTime: { gte: now } }, select: bookingSelect, orderBy: { pickupDateTime: "asc" } }),
      prisma.booking.count({ where: { ...ownBookings(a), status: "TRIP_STARTED" } }),
      prisma.corporateApprovalRequest.findMany({ where: { ...ownApprovals(a), status: "PENDING" }, select: { requestSnapshot: true, status: true, bookingId: true } }),
      prisma.corporateApprovalRequest.findMany({ where: { ...ownApprovals(a), status: "APPROVED", bookingId: null }, select: { requestSnapshot: true, status: true, bookingId: true } }),
      prisma.notification.count({ where: { userId: a.user.id, readAt: null } }),
      policyOf(a), budgetOf(a),
    ]);
    const live = (rows: { requestSnapshot: Prisma.JsonValue }[]) => rows.filter((r) => Date.parse((r.requestSnapshot as { pickupDateTime?: string } | null)?.pickupDateTime || "") > now.getTime()).length;
    return {
      profile: profileOf(a), upcoming: upcoming ? safeBooking(upcoming) : null, activeTrips: active,
      pendingApprovals: live(pending), approvedToBook: live(approved), unread, policy: policy.policy, budget, asOf: now,
    };
  }
  if (section === "trips") {
    if (id) {
      const b = await prisma.booking.findFirst({ where: { ...ownBookings(a), id }, select: { ...bookingSelect, statusHistory: { select: { currentStatus: true, remarks: true, changedAt: true }, orderBy: { changedAt: "asc" }, take: 50 } } });
      if (!b) throw new CorporateMobileError(404, "Trip not found.");
      const approvals = await approvalsForBookings([b.id]);
      return { ...safeBooking(b, approvals.get(b.id)), timeline: b.statusHistory };
    }
    const filter = request.nextUrl.searchParams.get("filter") || "UPCOMING";
    if (!FILTERS[filter]) throw new CorporateMobileError(400, "Invalid trip filter.");
    const n = page(request);
    const rows = await prisma.booking.findMany({ where: { ...ownBookings(a), ...FILTERS[filter] }, select: bookingSelect, orderBy: [{ pickupDateTime: filter === "UPCOMING" || filter === "ACTIVE" ? "asc" : "desc" }, { id: "asc" }], skip: (n - 1) * 20, take: 21 });
    const approvals = await approvalsForBookings(rows.map((r) => r.id));
    return { items: rows.slice(0, 20).map((r) => safeBooking(r, approvals.get(r.id))), page: n, hasMore: rows.length > 20 };
  }
  if (section === "trip-status") {
    if (!id) throw new CorporateMobileError(400, "Trip is required.");
    const b = await prisma.booking.findFirst({ where: { ...ownBookings(a), id }, select: { status: true, trip: { select: { status: true, deletedAt: true, driverAssignedAt: true, arrivedPickupAt: true, tripStartedAt: true, tripCompletedAt: true } } } });
    if (!b) throw new CorporateMobileError(404, "Trip not found.");
    const location = await trustedTripLocation(id, b);
    return { status: b.status, trip: b.trip?.deletedAt ? null : b.trip, liveTracking: !!location, location };
  }
  if (section === "approvals") {
    if (id) {
      const r = await prisma.corporateApprovalRequest.findFirst({ where: { ...ownApprovals(a), id }, select: approvalSelect });
      if (!r) throw new CorporateMobileError(404, "Request not found.");
      const booking = r.bookingId ? await prisma.booking.findFirst({ where: { ...ownBookings(a), id: r.bookingId }, select: { id: true, bookingNumber: true, status: true } }) : null;
      return safeApproval(r, booking);
    }
    const n = page(request);
    const rows = await prisma.corporateApprovalRequest.findMany({ where: ownApprovals(a), select: approvalSelect, orderBy: [{ submittedAt: "desc" }, { id: "desc" }], skip: (n - 1) * 20, take: 21 });
    return { items: rows.slice(0, 20).map((r) => safeApproval(r)), page: n, hasMore: rows.length > 20 };
  }
  if (section === "notifications") {
    const n = page(request);
    const where = { userId: a.user.id };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 31, skip: (n - 1) * 30, select: { id: true, title: true, message: true, readAt: true, createdAt: true } }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items: items.slice(0, 30), unread, page: n, hasMore: items.length > 30 };
  }
  throw new CorporateMobileError(404, "Not found.");
}
