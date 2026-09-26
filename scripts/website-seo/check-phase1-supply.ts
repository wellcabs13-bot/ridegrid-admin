import fs from "node:fs";
import { loadEnvConfig } from "@next/env";
import { categoryKey, locationKey } from "../../lib/website-public/marketplace";
import type { Phase1Page, Phase1SupplyState } from "../../lib/website-seo/page-factory/phase1-types";
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });

async function main() {
  const { prisma } = await import("../../lib/prisma");
  const { marketplaceListingService } = await import("../../lib/services/marketplace/MarketplaceListingService");
  const oldError = console.error; console.error = () => {};
  try {
    const at = new Date(Date.now() + 86400000);
    const date = at.toISOString().slice(0, 10), time = "12:00";
    const rates = await prisma.pricingRateVersion.findMany({
      where: { status: "APPROVED", effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
        pricingPackage: { isActive: true, pricingRule: { isActive: true } } },
      // Deliberately no vendor, vehicle or driver eligibility predicate: those are supply.
      select: { service: true, city: true, origin: true, destination: true, vehicleCategory: true,
        pricingPackage: { select: { city: true, fromCity: true, toCity: true, packageName: true } } },
    });
    const pages = JSON.parse(fs.readFileSync("data/seo/phase1-page-manifest.json", "utf8")) as Phase1Page[];
    const queries = new Map<string, Promise<number>>();
    const observations: { pageId: string; state: Phase1SupplyState; matchingPricing: number; hasBookableSupply: boolean }[] = [];
    for (const page of pages) {
      const wantedService = page.search.service === "LOCAL" ? "LOCAL_HOURLY" : page.search.service === "ROUNDTRIP" ? "OUTSTATION_ROUND_TRIP" : "OUTSTATION_ONE_WAY";
      const matching = rates.filter(rate => locationKey(rate.pricingPackage?.fromCity || rate.pricingPackage?.city || rate.origin || rate.city) === locationKey(page.city)
        && (page.pageType !== "route" || locationKey(rate.pricingPackage?.toCity || rate.destination) === locationKey(page.search.destination || ""))
        && (page.pageType !== "service" || rate.service === wantedService)
        && (page.pageType !== "vehicle" || categoryKey(rate.vehicleCategory) === categoryKey(page.search.category || ""))
        && ["LOCAL_HOURLY", "OUTSTATION_ONE_WAY", "OUTSTATION_ROUND_TRIP"].includes(rate.service));
      let state: Phase1SupplyState = "PRICING_NOT_CONFIGURED", listings = 0;
      if (page.bookingSupported && matching.length) {
        state = "LIVE_SUPPLY_EMPTY";
        for (const rate of matching) {
          const local = rate.service === "LOCAL_HOURLY";
          const filters = { serviceType: local ? "LOCAL" : "OUTSTATION", tripType: local ? "" : rate.service === "OUTSTATION_ROUND_TRIP" ? "ROUNDTRIP" : "ONEWAY",
            pickupCity: rate.pricingPackage?.fromCity || rate.pricingPackage?.city || rate.origin || rate.city,
            dropCity: rate.pricingPackage?.toCity || rate.destination, packageName: local ? rate.pricingPackage?.packageName || "" : "",
            category: page.pageType === "vehicle" ? rate.vehicleCategory : "", date, time, days: "1", limit: 1 };
          const key = JSON.stringify(filters);
          if (!queries.has(key)) queries.set(key, marketplaceListingService.search(filters).then(result => result.pagination.total));
          listings = Math.max(listings, await queries.get(key)!);
          if (listings) { state = "LIVE_SUPPLY_AVAILABLE"; break; }
        }
      }
      observations.push({ pageId: page.pageId, state, matchingPricing: page.bookingSupported ? matching.length : 0, hasBookableSupply: listings > 0 });
    }
    const counts = Object.fromEntries(["LIVE_SUPPLY_AVAILABLE", "LIVE_SUPPLY_EMPTY", "PRICING_NOT_CONFIGURED"].map(state => [state, observations.filter(o => o.state === state).length]));
    fs.writeFileSync("data/seo/phase1-supply.json", JSON.stringify({ checkedAt: new Date().toISOString(), date, time, counts,
      method: "Read-only active approved pricing dimensions, then central listing search (non-persisting quotes). City/area/vehicle supply means at least one matching supported journey; not a locality or all-dates guarantee. Capability-limited pages have no supported pricing path.", pages: observations }, null, 2) + "\n");
    console.log(JSON.stringify({ counts, distinctSearches: queries.size }));
  } finally { console.error = oldError; await prisma.$disconnect(); }
}
main().catch(() => { console.log("Supply audit unavailable; retain NOT_CHECKED rather than invent a supply status."); process.exitCode = 1; });
