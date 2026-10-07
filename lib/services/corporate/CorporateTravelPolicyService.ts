import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applicableBudgets } from "./CorporateBudgetService";

export type TravelPolicyInput = {
  corporateId: string;
  amount?: number;
  category?: string;
  pickupDateTime?: Date | string;
};

// The only reason on a trip that is otherwise inside policy when the policy asks for approval on every trip.
export const EVERY_TRIP_APPROVAL_REASON = "Your company requires approval for every trip.";

export type TravelDecision = "ALLOWED" | "APPROVAL_REQUIRED" | "NOT_ALLOWED";

type PolicyRecord = {
  id: string;
  policyName: string;
  maxTripAmount: Prisma.Decimal | null;
  allowedCategories: Prisma.JsonValue | null;
  advanceBookingHours: number | null;
  nightTravelAllowed: boolean;
  outstationAllowed: boolean;
  airportTravelAllowed: boolean;
  approvalRequired: boolean;
  // Optional so records and callers predating these controls keep their behaviour.
  localAllowed?: boolean;
  roundTripAllowed?: boolean;
  weekendTravelAllowed?: boolean;
  bookingStartHour?: number | null;
  bookingEndHour?: number | null;
  blockAboveAmount?: Prisma.Decimal | null;
  allowedCities?: Prisma.JsonValue | null;
};

export function policyServiceType(service: string): TripPolicyInput["serviceType"] {
  if (service.startsWith("AIRPORT")) return "AIRPORT";
  return service.startsWith("OUTSTATION") || service === "MULTI_CITY" ? "OUTSTATION" : "LOCAL";
}

export type TripPolicyInput = {
  amount: Prisma.Decimal.Value;
  category: string;
  serviceType: "LOCAL" | "OUTSTATION" | "AIRPORT";
  pickupDateTime: Date;
  tripType?: "ONEWAY" | "ROUNDTRIP";
  pickupCity?: string | null;
};

// Remaining amount of each budget that covers the trip (company, branch, department, employee).
export type BudgetHeadroom = { name: string; remaining: Prisma.Decimal.Value };

export type EmployeeLimits = {
  monthlyTravelLimit: Prisma.Decimal | null;
  yearlyTravelLimit: Prisma.Decimal | null;
};

export type EmployeeUsage = { monthUsed: Prisma.Decimal.Value; yearUsed: Prisma.Decimal.Value };

// Corporate travel rules are evaluated in the operating market's India time zone.
export function indiaHour(value: Date) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(value));
}

export function indiaPeriods(now = new Date()) {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).format(now).split("-");
  const monthStart = new Date(`${year}-${month}-01T00:00:00+05:30`);
  const next = Number(month) === 12 ? `${Number(year) + 1}-01` : `${year}-${String(Number(month) + 1).padStart(2, "0")}`;
  return {
    monthStart, monthEnd: new Date(`${next}-01T00:00:00+05:30`),
    yearStart: new Date(`${year}-01-01T00:00:00+05:30`), yearEnd: new Date(`${Number(year) + 1}-01-01T00:00:00+05:30`),
  };
}

export function policyCategories(policy: Pick<PolicyRecord, "allowedCategories"> | null) {
  return Array.isArray(policy?.allowedCategories) ? policy!.allowedCategories.map(String).filter(Boolean) : [];
}

export function policyCities(policy: Pick<PolicyRecord, "allowedCities"> | null) {
  return Array.isArray(policy?.allowedCities) ? policy!.allowedCities.map((c) => String(c).trim()).filter(Boolean) : [];
}

const indiaWeekday = (value: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short" }).format(value);
const cityKey = (value: string) => value.trim().toLowerCase();

// Most specific active policy wins: assigned to the employee, then the employee's
// department, then branch, then the company default (no branch or department).
export function choosePolicy<T extends { id: string; branchId?: string | null; departmentId?: string | null; updatedAt?: Date }>(
  policies: T[],
  employee: { travelPolicyId?: string | null; departmentId?: string | null; branchId?: string | null } = {},
): T | null {
  const newest = (rows: T[]) => [...rows].sort((a, b) => +(b.updatedAt ?? 0) - +(a.updatedAt ?? 0))[0] ?? null;
  return (employee.travelPolicyId ? policies.find((p) => p.id === employee.travelPolicyId) : undefined)
    ?? (employee.departmentId ? newest(policies.filter((p) => p.departmentId === employee.departmentId)) : null)
    ?? (employee.branchId ? newest(policies.filter((p) => p.branchId === employee.branchId && !p.departmentId)) : null)
    ?? newest(policies.filter((p) => !p.branchId && !p.departmentId));
}

// Hard prohibitions are NOT_ALLOWED and cannot be approved around. Every other
// violation follows the existing service semantics: it requires approval.
export function decideTravelPolicy(
  policy: PolicyRecord | null,
  trip: TripPolicyInput,
  limits: EmployeeLimits,
  usage: EmployeeUsage,
  now = new Date(),
  budgets: BudgetHeadroom[] = []
): { decision: TravelDecision; reasons: string[]; blocked: string[] } {
  const amount = new Prisma.Decimal(trip.amount);
  const blocked: string[] = [];
  const reasons: string[] = [];
  if (policy) {
    if (trip.serviceType === "OUTSTATION" && !policy.outstationAllowed)
      blocked.push("Outstation travel is not permitted by your company travel policy.");
    if (trip.serviceType === "AIRPORT" && !policy.airportTravelAllowed)
      blocked.push("Airport travel is not permitted by your company travel policy.");
    if (trip.serviceType === "LOCAL" && policy.localAllowed === false)
      blocked.push("Local rentals are not permitted by your company travel policy.");
    if (trip.tripType === "ROUNDTRIP" && policy.roundTripAllowed === false)
      blocked.push("Round trips are not permitted by your company travel policy.");
    if (policy.blockAboveAmount != null && amount.gt(policy.blockAboveAmount))
      blocked.push("This trip is above the maximum amount your company travel policy allows.");
    if (policy.advanceBookingHours && trip.pickupDateTime.getTime() - now.getTime() < policy.advanceBookingHours * 3600000)
      blocked.push(`Trips must be booked at least ${policy.advanceBookingHours} hour(s) before pickup.`);
    if (policy.maxTripAmount !== null && amount.gt(policy.maxTripAmount))
      reasons.push("Trip amount exceeds the corporate travel policy limit.");
    const categories = policyCategories(policy);
    if (categories.length && !categories.includes(trip.category))
      reasons.push("Travel category is not allowed by corporate policy.");
    if (!policy.nightTravelAllowed) {
      const hour = indiaHour(trip.pickupDateTime);
      if (hour >= 22 || hour < 6) reasons.push("Night travel is not allowed by corporate policy.");
    }
    if (policy.weekendTravelAllowed === false && ["Sat", "Sun"].includes(indiaWeekday(trip.pickupDateTime)))
      reasons.push("Weekend travel needs approval under corporate policy.");
    if (policy.bookingStartHour != null && policy.bookingEndHour != null && policy.bookingStartHour !== policy.bookingEndHour) {
      const hour = indiaHour(trip.pickupDateTime), start = policy.bookingStartHour, end = policy.bookingEndHour;
      const inside = start < end ? hour >= start && hour < end : hour >= start || hour < end;
      if (!inside) reasons.push("Pickup time is outside the travel hours allowed by corporate policy.");
    }
    const cities = policyCities(policy);
    if (cities.length && trip.pickupCity && !cities.some((c) => cityKey(c) === cityKey(trip.pickupCity!)))
      reasons.push("Pickup city is outside the cities allowed by corporate policy.");
  }
  for (const b of budgets)
    if (amount.gt(b.remaining)) reasons.push(`This trip exceeds the remaining ${b.name} budget.`);
  if (limits.monthlyTravelLimit !== null && amount.plus(usage.monthUsed).gt(limits.monthlyTravelLimit))
    reasons.push("This trip exceeds your monthly travel limit.");
  if (limits.yearlyTravelLimit !== null && amount.plus(usage.yearUsed).gt(limits.yearlyTravelLimit))
    reasons.push("This trip exceeds your yearly travel limit.");
  if (blocked.length) return { decision: "NOT_ALLOWED", reasons: [...blocked, ...reasons], blocked };
  if (policy?.approvalRequired && !reasons.length) reasons.push(EVERY_TRIP_APPROVAL_REASON);
  return { decision: reasons.length ? "APPROVAL_REQUIRED" : "ALLOWED", reasons, blocked };
}

export class CorporateTravelPolicyService {
  // The company default policy (not scoped to a branch or department).
  async getActivePolicy(corporateId: string) {
    return prisma.corporateTravelPolicy.findFirst({
      where: {
        corporateId,
        isActive: true,
        branchId: null,
        departmentId: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  // The policy that applies to one employee (see choosePolicy).
  async resolvePolicy(corporateId: string, employee: { travelPolicyId?: string | null; departmentId?: string | null; branchId?: string | null } = {}) {
    const policies = await prisma.corporateTravelPolicy.findMany({ where: { corporateId, isActive: true }, orderBy: { updatedAt: "desc" }, take: 200 });
    return choosePolicy(policies, employee);
  }

  async validate(input: TravelPolicyInput) {
    const policy = await this.getActivePolicy(input.corporateId);

    if (!policy) {
      return {
        allowed: true,
        approvalRequired: false,
        policy: null,
        violations: [],
      };
    }

    const violations: string[] = [];

    if (
      input.amount !== undefined &&
      policy.maxTripAmount !== null &&
      input.amount > Number(policy.maxTripAmount)
    ) {
      violations.push("Trip amount exceeds the corporate travel policy limit.");
    }

    if (
      input.category &&
      policy.allowedCategories
    ) {
      const categories = policyCategories(policy);

      if (
        categories.length > 0 &&
        !categories.includes(input.category)
      ) {
        violations.push("Travel category is not allowed by corporate policy.");
      }
    }

    if (input.pickupDateTime && !policy.nightTravelAllowed) {
      const date =
        input.pickupDateTime instanceof Date
          ? input.pickupDateTime
          : new Date(input.pickupDateTime);

      if (!Number.isNaN(date.getTime())) {
        const hour = indiaHour(date);

        if (hour >= 22 || hour < 6) {
          violations.push("Night travel is not allowed by corporate policy.");
        }
      }
    }

    return {
      allowed: violations.length === 0,
      approvalRequired:
        policy.approvalRequired || violations.length > 0,
      policy,
      violations,
    };
  }

  // Booked corporate spend of one employee: own non-cancelled bookings for this company.
  async employeeUsage(corporateId: string, userId: string, now = new Date()) {
    const p = indiaPeriods(now);
    const where = (start: Date, end: Date): Prisma.BookingWhereInput => ({
      corporateId, deletedAt: null, status: { not: "CANCELLED" },
      customer: { userId }, pickupDateTime: { gte: start, lt: end },
      // Guest rides booked by an administrator belong to the guest, not to the administrator's own allowance.
      NOT: { corporateTraveller: { is: { kind: "GUEST" } } },
    });
    const [month, year] = await Promise.all([
      prisma.booking.aggregate({ where: where(p.monthStart, p.monthEnd), _sum: { finalFare: true } }),
      prisma.booking.aggregate({ where: where(p.yearStart, p.yearEnd), _sum: { finalFare: true } }),
    ]);
    return { monthUsed: month._sum.finalFare ?? new Prisma.Decimal(0), yearUsed: year._sum.finalFare ?? new Prisma.Decimal(0), periods: p };
  }

  // Evaluates trips for one employee against the applicable policy, personal limits
  // and, when the employee record is given, every company budget covering the trip.
  async evaluateTrip(
    employee: { corporateId: string; userId: string; id?: string; travelPolicyId?: string | null; branchId?: string | null; departmentId?: string | null } & EmployeeLimits,
    trips: TripPolicyInput[],
    now = new Date()
  ) {
    const [policy, usage] = await Promise.all([
      employee.id ? this.resolvePolicy(employee.corporateId, employee) : this.getActivePolicy(employee.corporateId),
      this.employeeUsage(employee.corporateId, employee.userId, now),
    ]);
    // Budget headroom depends only on who and when, so trips at the same pickup time share one lookup.
    const headroom = new Map<number, Promise<BudgetHeadroom[]>>();
    const budgetsFor = (at: Date) => {
      if (!employee.id) return Promise.resolve([] as BudgetHeadroom[]);
      const key = at.getTime();
      if (!headroom.has(key)) headroom.set(key, applicableBudgets(employee.corporateId, { id: employee.id, userId: employee.userId, branchId: employee.branchId ?? null, departmentId: employee.departmentId ?? null }, at)
        .then((rows) => rows.map((b) => ({ name: b.scope === "COMPANY" ? `company "${b.name}"` : `${b.scope.toLowerCase()} "${b.name}"`, remaining: b.remaining }))));
      return headroom.get(key)!;
    };
    const results = await Promise.all(trips.map(async (trip) => decideTravelPolicy(policy, trip, employee, usage, now, await budgetsFor(trip.pickupDateTime))));
    return { policy, usage, results };
  }
}

export const corporateTravelPolicyService =
  new CorporateTravelPolicyService();
