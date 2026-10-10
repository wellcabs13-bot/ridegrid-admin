import { createHash, randomUUID } from "node:crypto";
import { Prisma, VehicleCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Band, Charge, Discount, Fee, PricingError, Rate, Scope, Tax, Terms, calculateBreakdown, canonicalService, decimal, money, normalize, resolveRate } from "./engine";
import { policyData } from "./config";
import { applicable, json, lock, selectPolicy } from "./RateService";
import { evaluateSmartReturnEligibility } from "@/lib/services/smart-return/SmartReturnEligibilityService";

export interface QuoteRequest extends Scope { vehicleId: string; at: Date; ownerId: string; idempotencyKey?: string; distanceKm?: string; durationHours?: string; days?: string; waitingHours?: string; smartReturnListingId?: string }
export type Breakdown = ReturnType<typeof calculateBreakdown>;
export type Snapshot = Breakdown & { vendorId: string; vehicleId: string; vehicleCategoryId: string; service: string; route: { origin: string; destination: string; city: string; area: string }; pricingPackageId: string | null; rateCardId: string; rateVersionId: string; rateVersion: number; calculationRule: Terms; policies: { id: string; version: number; kind: string }[]; currency: string; effectiveDate: string; quoteExpiry: string; calculatedAt: string; tripDateTime: string; tripMetrics?: { days: string; distanceKm?: string; durationHours?: string; waitingHours?: string }; smartReturn: unknown; normalFare: string; discountPolicyIds: string[] };
const digest = (r: QuoteRequest) => createHash("sha256").update(JSON.stringify({ vendorId:r.vendorId, vehicleId:r.vehicleId, vehicleCategory:r.vehicleCategory, service:r.service, city:normalize(r.city), origin:normalize(r.origin), destination:normalize(r.destination), area:normalize(r.area), pricingPackageId:r.pricingPackageId || null, at:r.at.toISOString(), ownerId:r.ownerId, distanceKm:r.distanceKm || "0", durationHours:r.durationHours || "0", days:r.days || "1", waitingHours:r.waitingHours || "0", smartReturnListingId:r.smartReturnListingId || null })).digest("hex");
export function assertQuoteUsable(quote: { expiresAt: Date; ownerId: string; vehicleId: string }, ownerId: string, vehicleId: string, now = new Date()) {
  if (quote.ownerId !== ownerId || quote.vehicleId !== vehicleId) throw new PricingError("FORBIDDEN", "Quote does not belong to this booking", 403);
  if (quote.expiresAt <= now) throw new PricingError("QUOTE_EXPIRED", "Your quote expired. Refresh your price before booking.");
}
async function assertAlignedPair(tx: Prisma.TransactionClient, vehicleId: string, vendorId: string, terms?: Terms) {
  if (!terms?.operational) return;
  const pair = await tx.vehicle.findFirst({ where: { id: vehicleId, vendorId, driverId: terms.operational.driverId, status: "AVAILABLE", deletedAt: null,
    vendor: { deletedAt: null, isApproved: true, user: { isActive: true, deletedAt: null } },
    driver: { is: { status: "ACTIVE", deletedAt: null, user: { isActive: true, deletedAt: null } } } } });
  if (!pair || terms.operational.vehicleId !== vehicleId) throw new PricingError("PRICE_UNAVAILABLE", "This price requires its active aligned car and driver");
}
export class QuoteService {
  async quote(request: QuoteRequest, persist = true, draftRateId?: string, proposedFare?: string) {
    if (!Number.isFinite(request.at.getTime()) || request.at < new Date(Date.now() - 60_000)) throw new PricingError("INVALID_INPUT", "Choose a current or future trip date", 400);
    const hash = digest(request), key = request.idempotencyKey || randomUUID();
    return prisma.$transaction(async tx => {
      await lock(tx, `quote:${key}`);
      const existing = await tx.pricingQuote.findUnique({ where: { idempotencyKey: key } });
      if (existing) {
        if (existing.requestHash !== hash) throw new PricingError("IDEMPOTENCY_CONFLICT");
        assertQuoteUsable(existing, request.ownerId, request.vehicleId);
        return { id: existing.id, expiresAt: existing.expiresAt, snapshot: existing.snapshot as unknown as Snapshot };
      }
      const vehicle = await tx.vehicle.findFirst({ where: { id: request.vehicleId, vendorId: request.vendorId, category: request.vehicleCategory as VehicleCategory, deletedAt: null } });
      if (!vehicle) throw new PricingError("PRICE_UNAVAILABLE");
      const versions = await tx.pricingRateVersion.findMany({ where: { vendorId: request.vendorId, service: request.service, vehicleCategory: vehicle.category, status: "APPROVED" } });
      const draft = draftRateId && !persist ? await tx.pricingRateVersion.findUnique({ where: { id: draftRateId } }) : null;
      if (draft && (draft.vendorId !== request.vendorId || draft.vehicleCategory !== request.vehicleCategory || draft.service !== request.service)) throw new PricingError("FORBIDDEN", "Draft does not match preview", 403);
      const policies = await tx.pricingPolicy.findMany({ where: { active: true } });
      const master = !persist && proposedFare !== undefined ? selectPolicy(policies,"MASTER",request,request.at)! : null;
      const proposed = master ? [{ id:"preview", pricingRuleId:"preview", pricingPackageId:request.pricingPackageId || null, vendorId:request.vendorId, vehicleCategory:vehicle.category, service:request.service, city:request.city || "", origin:request.origin || "", destination:request.destination || "", area:request.area || "", scopeKey:"preview", version:0, status:"APPROVED", effectiveFrom:request.at, effectiveTo:null, fare:money(proposedFare!), smartReturnFare:null, terms:master.data }] : null;
      type Resolved = Rate & { pricingRuleId:string; pricingPackageId:string|null; fare:Prisma.Decimal };
      let rate: Resolved;
      let fallbackPolicy = null;
      try { rate = resolveRate<Resolved>(proposed || (draft ? [{ ...draft, status: "APPROVED" }] : versions), request, request.at); }
      catch(error) {
        if (!(error instanceof PricingError) || error.code !== "PRICE_UNAVAILABLE") throw error;
        fallbackPolicy = selectPolicy(policies,"MASTER",request,request.at,false);
        const fallbackTerms = fallbackPolicy?.data as unknown as Terms | undefined;
        if (!fallbackTerms?.fallbackRateVersionId || !fallbackTerms.fallbackVendorIds?.includes(request.vendorId)) throw error;
        const fallback = await tx.pricingRateVersion.findUnique({where:{id:fallbackTerms.fallbackRateVersionId}});
        if (!fallback || fallback.pricingPackageId) throw error;
        rate = resolveRate<Resolved>([{...fallback,vendorId:request.vendorId}],request,request.at);
      }
      const fee = selectPolicy(policies, "FEE", request, request.at)!;
      const tax = selectPolicy(policies, "TAX", request, request.at)!;
      const charges = selectPolicy(policies, "CHARGES", request, request.at, false);
      const discountPolicies = policies.filter(p => p.kind === "DISCOUNT" && applicable(p, request, request.at)).sort((a,b) => a.id.localeCompare(b.id));
      const selected = [fee, tax, ...(charges ? [charges] : []), ...discountPolicies];
      if (fallbackPolicy) selected.push(fallbackPolicy);
      for (const p of discountPolicies) await lock(tx, `discount:${p.key}`);
      let fare = rate.fare, smartReturn: unknown = null;
      if (request.smartReturnListingId) {
        const listing = await tx.smartReturnListing.findUnique({ where: { id: request.smartReturnListingId }, include: { trip: true, booking: true } });
        if (!listing || listing.status !== "PUBLISHED" || !listing.expiresAt || listing.expiresAt <= new Date() || listing.vendorId !== request.vendorId || listing.vehicleId !== vehicle.id || request.service !== "OUTSTATION_ONE_WAY" || normalize(listing.pickupLocation) !== normalize(request.origin) || normalize(listing.dropLocation) !== normalize(request.destination) || !rate.smartReturnFare) throw new PricingError("SMART_RETURN_INELIGIBLE");
        const result = evaluateSmartReturnEligibility({ tripId:listing.tripId, bookingId:listing.bookingId, bookingNumber:listing.booking.bookingNumber, pickupLocation:listing.booking.pickupLocation, dropLocation:listing.booking.dropLocation, tripType:listing.booking.tripType, tripCompletedAt:listing.trip.tripCompletedAt, vendorId:listing.vendorId, vehicleId:listing.vehicleId });
        if (!result.eligible) throw new PricingError("SMART_RETURN_INELIGIBLE");
        const bandPolicy = selectPolicy(policies, "BAND", request, request.at)!;
        const band = policyData("BAND", bandPolicy.data) as Band;
        if (!band.smartMinimum || !band.smartMaximum || decimal(rate.smartReturnFare).lt(band.smartMinimum) || decimal(rate.smartReturnFare).gt(band.smartMaximum)) throw new PricingError("SMART_RETURN_OUTSIDE_BAND");
        selected.push(bandPolicy); fare = money(rate.smartReturnFare);
        smartReturn = { listingId: listing.id, eligibility: result, expiresAt: listing.expiresAt.toISOString() };
      }
      const terms = rate.terms as unknown as Terms;
      await assertAlignedPair(tx, request.vehicleId, request.vendorId, terms);
      if (terms.method === "PER_KM" && request.distanceKm === undefined) throw new PricingError("TRIP_METRICS_REQUIRED", "A verified trip distance is required");
      if (terms.method === "PER_HOUR" && request.durationHours === undefined) throw new PricingError("TRIP_METRICS_REQUIRED", "Trip duration is required");
      // Night duty uses the operating market's established India time zone.
      const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" }).format(request.at));
      const breakdown = calculateBreakdown({ fare, terms, distanceKm:request.distanceKm, durationHours:request.durationHours, days:request.days, waitingHours:request.waitingHours, night:hour >= 22 || hour < 6, fee:policyData("FEE", fee.data) as Fee, taxes:policyData("TAX", tax.data) as Tax[], charges: charges ? (policyData("CHARGES", charges.data) as Charge[]) : [], discounts:discountPolicies.map(p => policyData("DISCOUNT", p.data) as Discount) });
      const now = new Date();
      for (const [index, p] of discountPolicies.entries()) {
        const prior = await tx.pricingQuote.findMany({ where: { OR: [{ expiresAt: { gt: now } }, { booking: { isNot: null } }], snapshot: { path: ["discountPolicyIds"], array_contains: [p.id] } }, select: { snapshot: true } });
        const spent = prior.reduce((sum, q) => { const s = q.snapshot as unknown as Snapshot; const n = s.discountPolicyIds.indexOf(p.id); return sum.plus(s.discounts[n]?.amount || "0"); }, money(0));
        if (spent.plus(breakdown.discounts[index].amount).gt((policyData("DISCOUNT", p.data) as Discount).budget)) throw new PricingError("DISCOUNT_BUDGET_EXHAUSTED", "The available discount budget has been used");
      }
      const endTimes = [now.getTime() + 10 * 60_000, ...(rate.effectiveTo ? [rate.effectiveTo.getTime()] : []), ...selected.flatMap(p => p.effectiveTo ? [p.effectiveTo.getTime()] : [])];
      if (smartReturn) endTimes.push(new Date((smartReturn as { expiresAt: string }).expiresAt).getTime());
      const expiresAt = new Date(Math.min(...endTimes));
      if (expiresAt <= now) throw new PricingError("QUOTE_EXPIRED");
      const snapshot: Snapshot = { ...breakdown, vendorId:request.vendorId, vehicleId:vehicle.id, vehicleCategoryId:vehicle.category, service:request.service, route:{ origin:request.origin || "", destination:request.destination || "", city:request.city || "", area:request.area || "" }, pricingPackageId:rate.pricingPackageId, rateCardId:rate.pricingRuleId, rateVersionId:rate.id, rateVersion:rate.version, calculationRule:terms, policies:selected.map(p => ({ id:p.id, version:p.version, kind:p.kind })), currency:"INR", effectiveDate:rate.effectiveFrom.toISOString(), quoteExpiry:expiresAt.toISOString(), calculatedAt:now.toISOString(), tripDateTime:request.at.toISOString(), tripMetrics:{ days:request.days || "1", distanceKm:request.distanceKm, durationHours:request.durationHours, waitingHours:request.waitingHours }, smartReturn, normalFare:money(decimal(rate.fare).plus(decimal(breakdown.vendorFare).minus(fare))).toFixed(2), discountPolicyIds:discountPolicies.map(p => p.id) };
      if (!persist) return { id: null, expiresAt, snapshot };
      const quote = await tx.pricingQuote.create({ data: { idempotencyKey:key, requestHash:hash, ownerId:request.ownerId, vendorId:request.vendorId, vehicleId:vehicle.id, rateVersionId:rate.id, snapshot:json(snapshot), expiresAt } });
      return { id:quote.id, expiresAt, snapshot };
    }, { timeout: 15000 });
  }
  async forPackage(packageId: string, at: Date, ownerId: string, persist = false, idempotencyKey?: string, days?: string) {
    const pkg = await prisma.pricingPackage.findFirst({ where: { id: packageId, isActive:true, pricingRule:{ isActive:true } }, include: { pricingRule:true, vehicle:true } });
    if (!pkg) throw new PricingError("PRICE_UNAVAILABLE");
    const route = pkg.pricingRule.pricingType === "OUTSTATION" ? pkg.packageName.match(/^(.+?)\s+to\s+(.+)$/i) : null;
    const service = canonicalService((pkg.packageType && ["LOCAL_POINT_TO_POINT","LOCAL_HOURLY","AIRPORT_PICKUP","AIRPORT_DROP","OUTSTATION_ONE_WAY","OUTSTATION_ROUND_TRIP","MULTI_CITY","TOUR_PACKAGE","CORPORATE_POINT_TO_POINT","EMPLOYEE_TRANSPORT","LONG_TERM_RENTAL","EVENT_TRANSPORT"].includes(pkg.packageType)) ? pkg.packageType : pkg.pricingRule.pricingType, pkg.pricingRule.tripType, pkg.transferDirection);
    return this.quote({ vendorId:pkg.vehicle.vendorId, vehicleId:pkg.vehicleId, vehicleCategory:pkg.vehicle.category, service, city:pkg.city || "", origin:pkg.fromCity || route?.[1]?.trim() || "", destination:pkg.toCity || route?.[2]?.trim() || "", area:pkg.airportName || "", pricingPackageId:pkg.id, at, ownerId, idempotencyKey, ...(days ? { days } : {}) }, persist);
  }
}
export const quoteService = new QuoteService();
export async function consumeQuote(tx: Prisma.TransactionClient, id: string, ownerId: string, vehicleId: string) {
  await lock(tx, `consume:${id}`);
  const quote = await tx.pricingQuote.findUnique({ where: { id }, include: { booking: { select: { id:true } } } });
  if (!quote) throw new PricingError("PRICE_UNAVAILABLE");
  assertQuoteUsable(quote, ownerId, vehicleId);
  if (quote.booking) throw new PricingError("QUOTE_ALREADY_USED");
  const snapshot = quote.snapshot as unknown as Snapshot;
  await assertAlignedPair(tx, vehicleId, snapshot.vendorId, snapshot.calculationRule);
  return snapshot;
}

