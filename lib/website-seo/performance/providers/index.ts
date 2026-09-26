import type { AnalyticsProvider } from "../types";
// BookingSource.WEBSITE is a channel, not a verified SEO attribution relationship.
export const localAnalyticsProvider: AnalyticsProvider = {
  async traffic() { return { available: false, status: "NOT CONNECTED", metrics: { visits: null, users: null, sessions: null, clicks: null, impressions: null, ctr: null } }; },
  async pageTraffic() { return { available: false, status: "NOT CONNECTED", metrics: { visits: null } }; },
  async conversions() { return { available: false, status: "NOT ATTRIBUTED", metrics: { conversions: null } }; },
  async revenue() { return { available: false, status: "NOT ATTRIBUTED", metrics: { revenue: null } }; },
};
