import { deterministicKeywordDiscovery, type KeywordDiscoveryProvider, type KeywordEntity } from "../discovery";
import { normalizeWebsiteKeyword } from "../normalize";
import { classifyKeywordIntent, classifyKeywordType } from "../classification";
import { compareKeywords, keywordClusterKey, selectPrimaryKeyword } from "../clustering";
import { mapKeywordPage, type KeywordPage } from "../mapping";
import { scoreKeyword } from "../scoring";

export function analyzeKeywords(entity: KeywordEntity, pages: readonly KeywordPage[] = [],
  providers: readonly KeywordDiscoveryProvider[] = [deterministicKeywordDiscovery]) {
  const candidates = providers.flatMap(provider => [...provider.discover(entity)]);
  const normalized = [...new Set(candidates.map(normalizeWebsiteKeyword).filter(text => text.length >= 2))]
    .sort(compareKeywords);
  const classified = normalized.map(keyword => {
    const intent = classifyKeywordIntent(keyword);
    return { keyword, normalizedKeyword: keyword, intent, classification: classifyKeywordType(keyword, entity.type),
      clusterKey: keywordClusterKey(entity.id, intent) };
  });
  const clusters = new Map<string, string[]>();
  for (const item of classified) clusters.set(item.clusterKey, [...(clusters.get(item.clusterKey) ?? []), item.keyword]);
  const primaries = new Map([...clusters].map(([key, words]) => [key, selectPrimaryKeyword(words)]));
  const page = mapKeywordPage(entity.id, pages);
  const keywords = classified.map(item => {
    const primaryKeywordKey = primaries.get(item.clusterKey)!;
    const primary = primaryKeywordKey === item.keyword;
    const opportunity = scoreKeyword({ ...item, primary });
    return { ...item, type: primary ? "PRIMARY" as const : "SECONDARY" as const,
      entityId: entity.id, entityType: entity.type, page,
      primaryKeywordKey: primary ? null : primaryKeywordKey,
      status: "DISCOVERED" as const,
      metrics: { searchVolume: null, difficulty: null, cpc: null, competition: null, opportunityScore: opportunity.score },
      metadata: { engine: "W4.5", classification: item.classification, opportunity, page },
    };
  });
  return { entity: { id: entity.id, type: entity.type, name: entity.name },
    candidateCount: keywords.length, rawCandidateCount: candidates.length, clusterCount: clusters.size,
    keywords, mapping: { page, mappedKeywordCount: page ? keywords.length : 0 } };
}

export type KeywordAnalysis = ReturnType<typeof analyzeKeywords>;
