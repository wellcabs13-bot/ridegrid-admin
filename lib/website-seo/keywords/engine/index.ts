import { websiteEntityRepository } from "../../entities/repository";
import { websitePageRepository } from "../../pages/repository";
import { websiteKeywordRepository } from "../repository";
import { analyzeKeywords } from "./analyze";

export { analyzeKeywords } from "./analyze";
export type { KeywordAnalysis } from "./analyze";

export class KeywordEntityNotFoundError extends Error {}

export class KeywordIntelligenceEngine {
  analyze = analyzeKeywords;

  async generate(entityId: string, persist = false) {
    const entity = await websiteEntityRepository.findById(entityId);
    if (!entity) throw new KeywordEntityNotFoundError("Website entity not found.");
    const pages = await websitePageRepository.list({ entityId });
    const analysis = this.analyze(entity, pages);
    const persistence = persist ? await websiteKeywordRepository.persistAnalysis(analysis) : null;
    return { ...analysis, persistence };
  }
}

export const keywordIntelligenceEngine = new KeywordIntelligenceEngine();
