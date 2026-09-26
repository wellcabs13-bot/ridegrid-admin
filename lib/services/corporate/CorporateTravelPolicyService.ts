import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type TravelPolicyInput = {
  corporateId: string;
  amount?: number;
  category?: string;
  pickupDateTime?: Date | string;
};

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
};

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

// Hard prohibitions are NOT_ALLOWED and cannot be approved around. Every other
// violation follows the existing service semantics: it requires approval.
export function decideTravelPolicy(
  policy: PolicyRecord | null,
  trip: TripPolicyInput,
  limits: EmployeeLimits,
  usage: EmployeeUsage,
  now = new Date()
): { decision: TravelDecision; reasons: string[]; blocked: string[] } {
  const amount = new Prisma.Decimal(trip.amount);
  const blocked: string[] = [];
  const reasons: string[] = [];
  if (policy) {
    if (trip.serviceType === "OUTSTATION" && !policy.outstationAllowed)
      blocked.push("Outstation travel is not permitted by your company travel policy.");
    if (trip.serviceType === "AIRPORT" && !policy.airportTravelAllowed)
      blocked.push("Airport travel is not permitted by your company travel policy.");
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
  }
  if (limits.monthlyTravelLimit !== null && amount.plus(usage.monthUsed).gt(limits.monthlyTravelLimit))
    reasons.push("This trip exceeds your monthly travel limit.");
  if (limits.yearlyTravelLimit !== null && amount.plus(usage.yearUsed).gt(limits.yearlyTravelLimit))
    reasons.push("This trip exceeds your yearly travel limit.");
  if (blocked.length) return { decision: "NOT_ALLOWED", reasons: [...blocked, ...reasons], blocked };
  if (policy?.approvalRequired && !reasons.length) reasons.push("Your company requires approval for every trip.");
  return { decision: reasons.length ? "APPROVAL_REQUIRED" : "ALLOWED", reasons, blocked };
}

export class CorporateTravelPolicyService {
  async getActivePolicy(corporateId: string) {
    return prisma.corporateTravelPolicy.findFirst({
      where: {
        corporateId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
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
    });
    const [month, year] = await Promise.all([
      prisma.booking.aggregate({ where: where(p.monthStart, p.monthEnd), _sum: { finalFare: true } }),
      prisma.booking.aggregate({ where: where(p.yearStart, p.yearEnd), _sum: { finalFare: true } }),
    ]);
    return { monthUsed: month._sum.finalFare ?? new Prisma.Decimal(0), yearUsed: year._sum.finalFare ?? new Prisma.Decimal(0), periods: p };
  }

  async evaluateTrip(
    employee: { corporateId: string; userId: string } & EmployeeLimits,
    trips: TripPolicyInput[],
    now = new Date()
  ) {
    const [policy, usage] = await Promise.all([
      this.getActivePolicy(employee.corporateId),
      this.employeeUsage(employee.corporateId, employee.userId, now),
    ]);
    return { policy, usage, results: trips.map((trip) => decideTravelPolicy(policy, trip, employee, usage, now)) };
  }
}

export const corporateTravelPolicyService =
  new CorporateTravelPolicyService();
