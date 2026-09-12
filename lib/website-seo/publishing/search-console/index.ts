import type { SearchConsoleState } from "../types";
export interface SearchConsoleProvider {
  notifySitemap(url: string): Promise<{ accepted: boolean }>;
  inspect(url: string): Promise<SearchConsoleState>;
  getCoverage(url: string): Promise<SearchConsoleState>;
}
const unknown = (): SearchConsoleState => ({ provider: "local", coverage: "UNKNOWN", crawl: "UNKNOWN", observedAt: null });
export const localSearchConsoleProvider: SearchConsoleProvider = {
  async notifySitemap() { return { accepted: false }; }, async inspect() { return unknown(); }, async getCoverage() { return unknown(); },
};
