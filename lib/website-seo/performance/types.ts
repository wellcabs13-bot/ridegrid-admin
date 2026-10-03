export const WINDOWS = ["7D", "30D", "90D"] as const;
export type PerformanceWindow = typeof WINDOWS[number];
export type ReportRow = Record<string, string | number | boolean | null>;
export interface PerformanceReport {
  window: PerformanceWindow;
  from: string;
  to: string;
  cards: ReportRow;
  sections: { title: string; rows: ReportRow[]; note?: string }[];
}
export interface AnalyticsResult {
  available: boolean;
  status: "CONNECTED" | "NOT CONNECTED" | "NOT ATTRIBUTED";
  metrics: Record<string, number | null>;
}
export interface AnalyticsProvider {
  traffic(from: Date, to: Date): Promise<AnalyticsResult>;
  pageTraffic(pageIds: string[], from: Date, to: Date): Promise<AnalyticsResult>;
  conversions(from: Date, to: Date): Promise<AnalyticsResult>;
  revenue(from: Date, to: Date): Promise<AnalyticsResult>;
}
