import type { IndexingRequest, IndexingStatus } from "../types";
import { localSearchConsoleProvider, type SearchConsoleProvider } from "../search-console";
export interface IndexingProvider {
  readonly id: string;
  submitDiscovery(request: IndexingRequest): Promise<IndexingStatus>;
  inspect(url: string): Promise<IndexingStatus>;
  getStatus(url: string): Promise<IndexingStatus>;
}
/** Normal-page discovery uses sitemap notification only, never the Google Indexing API. */
export function searchConsoleDiscoveryProvider(consoleProvider: SearchConsoleProvider, id: string): IndexingProvider {
  return { id,
    async submitDiscovery(request) {
      const result = await consoleProvider.notifySitemap(request.sitemapUrl);
      return { provider: id, requestState: result.accepted ? "ACCEPTED" : "NOT_SENT", external: await consoleProvider.inspect(request.url) };
    },
    async inspect(url) { return { provider: id, requestState: "NOT_SENT", external: await consoleProvider.inspect(url) }; },
    async getStatus(url) { return { provider: id, requestState: "NOT_SENT", external: await consoleProvider.getCoverage(url) }; },
  };
}
export const localIndexingProvider = searchConsoleDiscoveryProvider(localSearchConsoleProvider, "local");
