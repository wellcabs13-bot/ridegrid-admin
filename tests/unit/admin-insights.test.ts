// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildInsights, type AnalyticsSignals, type DashboardSignals } from "@/lib/admin/insights";

const quiet: DashboardSignals = {
  attention: { pendingApprovals: 0, staleHolds: 0, upcoming24hNoDriver: 0, refundsDue: 0, openTickets: 0, failedPayments: 0 },
  people: { pendingVendors: 0 },
  marketplace: { bookableVehicles: 5, activeVehicles: 6 },
  revenue: { refundsDueAmount: 0 },
};
const series = (counts: number[]) => counts.map(bookings => ({ bookings }));
const analytics = (over: Partial<AnalyticsSignals> = {}): AnalyticsSignals => ({
  period: { days: 30 }, series: series(Array(30).fill(0)), routes: [], topVendors: [],
  cancellations: { cancelled: 0, total: 0, rate: null }, payu: { attempts: 0, successRate: null }, ...over,
});

describe("admin insights", () => {
  it("returns nothing when nothing is measurable", () => {
    expect(buildInsights(null, null)).toEqual([]);
    expect(buildInsights(quiet, analytics())).toEqual([]);
  });

  it("reports only operational items that are actually non-zero, most urgent first", () => {
    const out = buildInsights({ ...quiet, attention: { ...quiet.attention, upcoming24hNoDriver: 2, failedPayments: 1, openTickets: 0 }, revenue: { refundsDueAmount: 1500 } });
    expect(out.map(i => i.id)).toEqual(["no-driver", "failed-payments"]);
    expect(out[0]).toMatchObject({ priority: "High", href: "/bookings?status=CONFIRMED" });
    expect(out[0].title).toContain("2 trips");
  });

  it("flags a marketplace with vehicles but none bookable, and stays quiet with no vehicles at all", () => {
    expect(buildInsights({ ...quiet, marketplace: { bookableVehicles: 0, activeVehicles: 3 } }).map(i => i.id)).toContain("no-supply");
    expect(buildInsights({ ...quiet, marketplace: { bookableVehicles: 0, activeVehicles: 0 } })).toEqual([]);
  });

  it("does not report a trend on thin data and does on enough data", () => {
    expect(buildInsights(null, analytics({ series: series([...Array(15).fill(0), ...Array(15).fill(3)]) }))).toEqual([]);
    const grown = buildInsights(null, analytics({ series: series([...Array(15).fill(1), ...Array(15).fill(2)]) }));
    expect(grown.find(i => i.id === "trend")).toMatchObject({ tone: "good", title: "Bookings up 100% over the last 15 days" });
    const fell = buildInsights(null, analytics({ series: series([...Array(15).fill(2), ...Array(15).fill(1)]) }));
    expect(fell.find(i => i.id === "trend")).toMatchObject({ tone: "warn" });
  });

  it("ignores small movements and small samples for rates", () => {
    expect(buildInsights(null, analytics({ cancellations: { cancelled: 2, total: 5, rate: 40 } }))).toEqual([]);
    expect(buildInsights(null, analytics({ payu: { attempts: 3, successRate: 33.3 } }))).toEqual([]);
    const out = buildInsights(null, analytics({ cancellations: { cancelled: 4, total: 20, rate: 20 }, payu: { attempts: 10, successRate: 70 } }));
    expect(out.map(i => i.id).sort()).toEqual(["cancellations", "payu"]);
  });

  it("names the real top route and warns on vendor concentration only with volume", () => {
    const series30 = series(Array(30).fill(1));
    const out = buildInsights(null, analytics({ series: series30, routes: [{ route: "Pune → Mumbai", bookings: 9, value: 45000 }], topVendors: [{ name: "Acme Cabs", bookings: 18, value: 90000 }] }));
    expect(out.find(i => i.id === "top-route")?.title).toBe("Pune → Mumbai is the top route");
    expect(out.find(i => i.id === "vendor-share")?.title).toBe("Acme Cabs handles 60% of bookings");
    const thin = buildInsights(null, analytics({ series: series(Array(30).fill(0)), topVendors: [{ name: "Acme Cabs", bookings: 2, value: 1000 }] }));
    expect(thin.find(i => i.id === "vendor-share")).toBeUndefined();
  });
});
