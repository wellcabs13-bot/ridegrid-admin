import { Prisma } from "@prisma/client";

export const SERVICES = ["LOCAL_POINT_TO_POINT", "LOCAL_HOURLY", "AIRPORT_PICKUP", "AIRPORT_DROP", "OUTSTATION_ONE_WAY", "OUTSTATION_ROUND_TRIP", "MULTI_CITY", "TOUR_PACKAGE", "CORPORATE_POINT_TO_POINT", "EMPLOYEE_TRANSPORT", "LONG_TERM_RENTAL", "EVENT_TRANSPORT"] as const;
export type Service = typeof SERVICES[number];
export class PricingError extends Error {
  constructor(public code: string, message = code, public status = 409) { super(message); }
}
export type Money = string | Prisma.Decimal;
export const decimal = (value: Money | number) => new Prisma.Decimal(value);
export const money = (value: Money | number) => decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
export const amount = (value: Money | number) => money(value).toFixed(2);
export function nonnegative(value: unknown, name: string): string {
  if (typeof value !== "string" && typeof value !== "number") throw new PricingError("INVALID_INPUT", `${name} is required`, 400);
  if (!/^\d{1,10}(\.\d{1,6})?$/.test(String(value))) throw new PricingError("INVALID_INPUT", `${name} must be a non-negative decimal`, 400);
  return String(value);
}
export function canonicalService(pricingType: string, tripType: string, direction?: string | null): Service {
  if ((SERVICES as readonly string[]).includes(pricingType)) return pricingType as Service;
  if (pricingType === "OUTSTATION") return tripType === "ROUNDTRIP" ? "OUTSTATION_ROUND_TRIP" : "OUTSTATION_ONE_WAY";
  if (pricingType === "AIRPORT") return direction?.toUpperCase() === "DROP" ? "AIRPORT_DROP" : "AIRPORT_PICKUP";
  if (pricingType === "HOURLY") return "LOCAL_HOURLY";
  return "LOCAL_POINT_TO_POINT";
}
export const normalize = (s?: string | null) => (s || "").trim().toLowerCase();
export interface Scope { vendorId: string; vehicleCategory: string; service: string; city?: string; origin?: string; destination?: string; area?: string; pricingPackageId?: string | null }
export interface Rate extends Scope { id: string; scopeKey: string; version: number; status: string; effectiveFrom: Date; effectiveTo: Date | null; fare: Money; terms: unknown; smartReturnFare: Money | null }
export function scopeKey(s: Scope) { return JSON.stringify([s.vendorId, s.vehicleCategory, s.service, ...[s.city, s.origin, s.destination, s.area, s.pricingPackageId].map(normalize)]); }
export function effective(r: { effectiveFrom: Date; effectiveTo: Date | null }, at: Date) { return r.effectiveFrom <= at && (!r.effectiveTo || r.effectiveTo > at); }
export function resolveRate<T extends Rate>(rates: T[], scope: Scope, at: Date): T {
  const ranked = rates.filter(r => r.status === "APPROVED" && effective(r, at) && r.vendorId === scope.vendorId && r.vehicleCategory === scope.vehicleCategory && r.service === scope.service)
    .filter(r => (!r.pricingPackageId || r.pricingPackageId === scope.pricingPackageId) && ["city", "origin", "destination", "area"].every(k => !r[k as keyof Scope] || normalize(r[k as keyof Scope]) === normalize(scope[k as keyof Scope])))
    .map(r => ({ r, rank: (r.origin && r.destination ? 40 : r.area ? 30 : r.city ? 20 : 10) + (r.pricingPackageId ? 1 : 0) }))
    .sort((a, b) => b.rank - a.rank);
  if (!ranked.length) throw new PricingError("PRICE_UNAVAILABLE");
  if (ranked[1]?.rank === ranked[0].rank) throw new PricingError("CONFLICTING_RATES");
  return ranked[0].r;
}
export interface OperationalTerms { service: "LOCAL" | "ONE_WAY" | "ROUNDTRIP"; vehicleId: string; driverId: string; driverName: string; car: string; driverAllowancePerDay: string; extraPickupDrop: string; waitingFreeMinutes: string; toll: "AS_APPLICABLE"; parking: "AS_APPLICABLE" }
export interface Terms { method: "FIXED" | "PER_KM" | "PER_HOUR"; includedKm: string; includedHours: string; minimumKmPerDay: string; perKm: string; perHour: string; driverAllowance: string; waitingPerHour: string; nightCharge: string; cancellationReference: string; fallbackRateVersionId?: string; fallbackVendorIds?: string[]; operational?: OperationalTerms }
export interface Band { minimum: string; recommended: string; maximum: string; autoMinimum: string; autoMaximum: string; smartMinimum?: string; smartMaximum?: string }
export function inBand(fare: Money, band: Band, auto = false) {
  return decimal(fare).gte(auto ? band.autoMinimum : band.minimum) && decimal(fare).lte(auto ? band.autoMaximum : band.maximum);
}
export interface Fee { fixed: string; percent: string; minimum: string; maximum?: string; processingFixed: string; processingPercent: string; waive: boolean }
export interface Tax { name: string; rate: string; components: ("VENDOR_FARE" | "PLATFORM_FEE" | "PASS_THROUGH")[]; deductVendorDiscount: boolean; deductPlatformDiscount: boolean; jurisdiction: string }
export interface Discount { name: string; fixed: string; percent: string; cap: string; vendorPercent: string; budget: string }
export interface Charge { name: string; amount: string; vendorPayable: boolean; included: boolean }
export interface CalculationInput { fare: Money; terms: Terms; distanceKm?: string; durationHours?: string; days?: string; waitingHours?: string; night?: boolean; fee: Fee; taxes: Tax[]; discounts: Discount[]; charges: Charge[] }
export function calculateBreakdown(i: CalculationInput) {
  const t = i.terms;
  // Only the simplified service terms opt in. Existing rate methods are unchanged.
  const local = t.operational?.service === "LOCAL", daily = t.operational?.service === "ROUNDTRIP";
  const days = decimal(i.days || "1");
  if (daily && (!days.isInteger() || days.lt(1))) throw new PricingError("INVALID_INPUT", "Trip days must be a positive whole number", 400);
  const distance = Prisma.Decimal.max(decimal(i.distanceKm || "0"), decimal(t.minimumKmPerDay).mul(i.days || "1"));
  const includedKm = decimal(t.includedKm).mul(daily ? days : 1);
  const distanceCharge = t.method === "PER_KM" || local || daily ? money(Prisma.Decimal.max(distance.minus(includedKm), 0).mul(t.perKm)) : money(0);
  const timeCharge = t.method === "PER_HOUR" || local ? money(Prisma.Decimal.max(decimal(i.durationHours || "0").minus(t.includedHours), 0).mul(t.perHour)) : money(0);
  const waiting = Prisma.Decimal.max(decimal(i.waitingHours || "0").minus(decimal(t.operational?.waitingFreeMinutes || "0").div(60)), 0);
  const vendorFare = money(decimal(i.fare).mul(daily ? days : 1).plus(distanceCharge).plus(timeCharge).plus(decimal(t.driverAllowance).mul(days)).plus(decimal(t.waitingPerHour).mul(waiting)).plus(i.night ? t.nightCharge : 0));
  let platformFee = money(decimal(i.fee.fixed).plus(vendorFare.mul(i.fee.percent).div(100)));
  platformFee = Prisma.Decimal.max(platformFee, i.fee.minimum);
  if (i.fee.maximum !== undefined) platformFee = Prisma.Decimal.min(platformFee, i.fee.maximum);
  if (i.fee.waive) platformFee = money(0);
  let vendorDiscount = money(0), platformDiscount = money(0);
  const discounts = i.discounts.map(d => {
    const value = money(Prisma.Decimal.min(decimal(d.fixed).plus(vendorFare.mul(d.percent).div(100)), d.cap));
    const vendor = money(value.mul(d.vendorPercent).div(100));
    const platform = value.minus(vendor);
    vendorDiscount = vendorDiscount.plus(vendor); platformDiscount = platformDiscount.plus(platform);
    return { name: d.name, amount: amount(value), vendorFunded: amount(vendor), rideGridFunded: amount(platform) };
  });
  const charges = i.charges.map(c => ({ ...c, amount: amount(c.amount) }));
  const passThrough = charges.reduce((sum, c) => sum.plus(c.included ? 0 : c.amount), money(0));
  const vendorExtras = charges.reduce((sum, c) => sum.plus(c.vendorPayable && !c.included ? c.amount : 0), money(0));
  if (vendorDiscount.gt(vendorFare) || vendorDiscount.plus(platformDiscount).gt(vendorFare.plus(platformFee).plus(passThrough))) throw new PricingError("DISCOUNT_EXCEEDS_PRICE");
  const taxComponents = i.taxes.map(tax => {
    let base = money(0);
    if (tax.components.includes("VENDOR_FARE")) base = base.plus(vendorFare).minus(tax.deductVendorDiscount ? vendorDiscount : 0);
    if (tax.components.includes("PLATFORM_FEE")) base = base.plus(platformFee);
    if (tax.components.includes("PASS_THROUGH")) base = base.plus(passThrough);
    if (tax.deductPlatformDiscount) base = Prisma.Decimal.max(base.minus(platformDiscount), 0);
    return { name: tax.name, jurisdiction: tax.jurisdiction, rate: tax.rate, taxableAmount: amount(base), amount: amount(base.mul(tax.rate).div(100)) };
  });
  const tax = taxComponents.reduce((s, t) => s.plus(t.amount), money(0));
  const finalPayable = money(vendorFare.plus(platformFee).plus(tax).plus(passThrough).minus(vendorDiscount).minus(platformDiscount));
  const processingCost = money(decimal(i.fee.processingFixed).plus(finalPayable.mul(i.fee.processingPercent).div(100)));
  return { vendorFare: amount(vendorFare), distanceCharge: amount(distanceCharge), timeCharge: amount(timeCharge), platformFee: amount(platformFee), taxComponents, taxAmount: amount(tax), discounts, vendorFundedDiscount: amount(vendorDiscount), rideGridFundedDiscount: amount(platformDiscount), passThroughCharges: charges, passThroughTotal: amount(passThrough), vendorPayableExtras: amount(vendorExtras), finalPayable: amount(finalPayable), vendorPayout: amount(vendorFare.plus(vendorExtras).minus(vendorDiscount)), processingCost: amount(processingCost), rideGridRevenue: amount(platformFee.minus(platformDiscount).minus(processingCost)) };
}

