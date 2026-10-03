import type { ObservationInput, ObservationKind, ObservationSubject } from "../types";
export interface SearchLookup { query: string; subject: ObservationSubject; competitorId?: string }
export type SearchLookupResult = { state: "UNAVAILABLE"; provider: string; reason: string; observations: [] } |
  { state: "AVAILABLE"; provider: string; observations: ObservationInput[] };
export interface SearchIntelligenceProvider {
  readonly id: string;
  lookup(kind: ObservationKind, input: SearchLookup): Promise<SearchLookupResult>;
}
export const SEARCH_PROVIDER_STATE = { state: "UNAVAILABLE", provider: "local", reason: "No external ranking or AI visibility provider is configured." } as const;
export const localSearchIntelligenceProvider: SearchIntelligenceProvider = {
  id: "local",
  async lookup() { return { ...SEARCH_PROVIDER_STATE, observations: [] }; },
};
