// Operational insights for the Super Admin dashboard and AI Intelligence page.
//
// Every insight is a deterministic rule evaluated on real /api/admin/dashboard and
// /api/admin/analytics values. There is no model, forecast or invented figure here:
// if a number is not in the payload, the rule does not fire. These are rules, not AI,
// and the UI labels them that way.

export type DashboardSignals = {
  attention: { pendingApprovals: number; staleHolds: number; upcoming24hNoDriver: number; refundsDue: number; openTickets: number; failedPayments: number };
  people: { pendingVendors: number };
  marketplace: { bookableVehicles: number; activeVehicles: number };
  revenue: { refundsDueAmount: number };
};

export type AnalyticsSignals = {
  period: { days: number };
  series: { bookings: number }[];
  routes: { route: string; bookings: number; value: number }[];
  topVendors: { name: string; bookings: number; value: number }[];
  cancellations: { cancelled: number; total: number; rate: number | null };
  payu: { attempts: number; successRate: number | null };
};

export type Priority = "High" | "Medium" | "Low" | "Info";
export type Insight = {
  id: string;
  priority: Priority;
  tone: "critical" | "warn" | "good" | "info";
  title: string;
  detail?: string;
  href?: string;
  source: "Operations" | "Analytics";
};

const ORDER: Record<Priority, number> = { High: 0, Medium: 1, Low: 2, Info: 3 };
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-IN")} ${n === 1 ? one : many}`;
const inr = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

// Minimum activity before a trend or ratio is reported, so one booking never reads as "+100%".
const MIN_TREND_BOOKINGS = 10;
const MIN_RATE_SAMPLE = 10;

export function buildInsights(dashboard?: DashboardSignals | null, analytics?: AnalyticsSignals | null): Insight[] {
  const out: Insight[] = [];
  if (dashboard) {
    const a = dashboard.attention;
    if (a.upcoming24hNoDriver > 0)
      out.push({ id: "no-driver", priority: "High", tone: "critical", source: "Operations", title: `${plural(a.upcoming24hNoDriver, "trip")} in the next 24 hours ${a.upcoming24hNoDriver === 1 ? "has" : "have"} no driver assigned`, detail: "Assign a driver before pickup.", href: "/bookings?status=CONFIRMED" });
    if (a.refundsDue > 0)
      out.push({ id: "refunds", priority: "High", tone: "critical", source: "Operations", title: `${plural(a.refundsDue, "refund")} due (${inr(dashboard.revenue.refundsDueAmount)})`, detail: "Customers are waiting on a pending refund.", href: "/finance?tab=refunds" });
    if (dashboard.marketplace.activeVehicles > 0 && dashboard.marketplace.bookableVehicles === 0)
      out.push({ id: "no-supply", priority: "High", tone: "critical", source: "Operations", title: "No vehicle is marketplace-ready", detail: `${plural(dashboard.marketplace.activeVehicles, "active vehicle")} exist, but none can be booked (check driver, vendor and pricing).`, href: "/vehicles" });
    if (a.failedPayments > 0)
      out.push({ id: "failed-payments", priority: "Medium", tone: "warn", source: "Operations", title: `${plural(a.failedPayments, "failed payment")} this month`, href: "/finance?paymentStatus=FAILED" });
    if (a.pendingApprovals > 0)
      out.push({ id: "corp-approvals", priority: "Medium", tone: "warn", source: "Operations", title: `${plural(a.pendingApprovals, "corporate approval")} waiting`, href: "/corporate" });
    if (dashboard.people.pendingVendors > 0)
      out.push({ id: "vendor-verification", priority: "Medium", tone: "warn", source: "Operations", title: `${plural(dashboard.people.pendingVendors, "vendor")} awaiting verification`, detail: "Review vendor documents to bring them live.", href: "/vendors?status=PENDING" });
    if (a.openTickets > 0)
      out.push({ id: "tickets", priority: "Medium", tone: "warn", source: "Operations", title: `${plural(a.openTickets, "open support ticket")}`, href: "/support" });
    if (a.staleHolds > 0)
      out.push({ id: "stale-holds", priority: "Low", tone: "info", source: "Operations", title: `${plural(a.staleHolds, "expired payment hold")}`, detail: "Held vehicles that were never paid for.", href: "/bookings?status=AWAITING_PAYMENT" });
  }
  if (analytics) {
    const days = analytics.period.days, half = Math.floor(analytics.series.length / 2);
    if (half >= 3) {
      const sum = (rows: { bookings: number }[]) => rows.reduce((s, r) => s + r.bookings, 0);
      const before = sum(analytics.series.slice(0, half)), after = sum(analytics.series.slice(analytics.series.length - half));
      if (before >= MIN_TREND_BOOKINGS && before + after >= MIN_TREND_BOOKINGS * 2) {
        const pct = Math.round(((after - before) / before) * 1000) / 10;
        if (Math.abs(pct) >= 10)
          out.push({ id: "trend", priority: "Info", tone: pct > 0 ? "good" : "warn", source: "Analytics", title: `Bookings ${pct > 0 ? "up" : "down"} ${Math.abs(pct)}% over the last ${half} days`, detail: `${plural(after, "booking")} vs ${plural(before, "booking")} in the ${half} days before (last ${days} days).`, href: "/analytics" });
      }
    }
    const top = analytics.routes[0];
    if (top && top.bookings > 0)
      out.push({ id: "top-route", priority: "Info", tone: "info", source: "Analytics", title: `${top.route} is the top route`, detail: `${plural(top.bookings, "booking")} · ${inr(top.value)} in the last ${days} days.`, href: "/analytics" });
    const total = analytics.series.reduce((s, r) => s + r.bookings, 0), vendor = analytics.topVendors[0];
    if (vendor && total >= MIN_RATE_SAMPLE) {
      const share = Math.round((vendor.bookings / total) * 100);
      if (share >= 40)
        out.push({ id: "vendor-share", priority: "Medium", tone: "warn", source: "Analytics", title: `${vendor.name} handles ${share}% of bookings`, detail: "High reliance on one vendor; consider widening supply.", href: "/vendors" });
    }
    const c = analytics.cancellations;
    if (c.rate !== null && c.total >= MIN_RATE_SAMPLE && c.rate >= 15)
      out.push({ id: "cancellations", priority: "Medium", tone: "warn", source: "Analytics", title: `Cancellation rate is ${c.rate}%`, detail: `${plural(c.cancelled, "booking")} cancelled out of ${c.total.toLocaleString("en-IN")} in the last ${days} days.`, href: "/bookings?status=CANCELLED" });
    if (analytics.payu.successRate !== null && analytics.payu.attempts >= 5 && analytics.payu.successRate < 80)
      out.push({ id: "payu", priority: "Medium", tone: "warn", source: "Analytics", title: `PayU success rate is ${analytics.payu.successRate}%`, detail: `Across ${plural(analytics.payu.attempts, "attempt")} in the last ${days} days.`, href: "/finance?paymentStatus=FAILED" });
  }
  return out.sort((x, y) => ORDER[x.priority] - ORDER[y.priority]);
}
