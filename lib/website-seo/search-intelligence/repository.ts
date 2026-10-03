import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { websiteKeywordRepository } from "../keywords/repository";
import { websiteEntityRepository } from "../entities/repository";
import { websitePageRepository } from "../pages/repository";
import { deriveClusters, deriveOpportunities } from "./engine";
import { SearchIntelligenceInputError, validateCompetitor, validateObservation } from "./validation";
import { SEARCH_PROVIDER_STATE } from "./providers";

export class SearchIntelligenceRepository {
  async competitors(search?: string, status?: string) {
    return prisma.websiteSeoCompetitor.findMany({ where: { ...(status ? { status } : {}), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { domain: { contains: search, mode: "insensitive" } }] } : {}) }, orderBy: { name: "asc" } });
  }
  async competitor(id: string) { return prisma.websiteSeoCompetitor.findUnique({ where: { id } }); }
  async createCompetitor(input: unknown) {
    const data = validateCompetitor(input);
    return prisma.websiteSeoCompetitor.create({ data: { name: data.name!, domain: data.domain!, status: data.status!, notes: data.notes } });
  }
  async updateCompetitor(id: string, input: unknown) {
    const data = validateCompetitor(input, true);
    return prisma.websiteSeoCompetitor.update({ where: { id }, data });
  }
  async observations(filters: { kind?: string; subject?: string; search?: string; competitorId?: string; keywordId?: string; pageId?: string; offset: number; limit: number }) {
    const where: Prisma.WebsiteSeoSearchObservationWhereInput = {
      ...(filters.kind ? { kind: filters.kind } : {}), ...(filters.subject ? { subject: filters.subject } : {}),
      ...(filters.search ? { query: { contains: filters.search, mode: "insensitive" } } : {}),
      ...(filters.competitorId ? { competitorId: filters.competitorId } : {}), ...(filters.keywordId ? { keywordId: filters.keywordId } : {}), ...(filters.pageId ? { pageId: filters.pageId } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.websiteSeoSearchObservation.findMany({ where, include: { competitor: true }, orderBy: [{ observedAt: "desc" }, { id: "desc" }], skip: filters.offset, take: filters.limit }),
      prisma.websiteSeoSearchObservation.count({ where }),
    ]);
    return { items, total, offset: filters.offset, limit: filters.limit };
  }
  async createObservation(input: unknown) {
    const data = validateObservation(input);
    return prisma.$transaction(async (tx) => {
      if (data.competitorId && !await tx.websiteSeoCompetitor.findUnique({ where: { id: data.competitorId } })) throw new SearchIntelligenceInputError("Competitor does not exist.");
      const keyword = data.keywordId ? await tx.websiteSeoKeyword.findUnique({ where: { id: data.keywordId } }) : null;
      const page = data.pageId ? await tx.websiteSeoPage.findUnique({ where: { id: data.pageId } }) : null;
      if (data.keywordId && !keyword) throw new SearchIntelligenceInputError("Keyword does not exist.");
      if (data.pageId && !page) throw new SearchIntelligenceInputError("Page does not exist.");
      if (keyword?.entityId && page && keyword.entityId !== page.entityId) throw new SearchIntelligenceInputError("Keyword and page belong to different entities.");
      return tx.websiteSeoSearchObservation.create({ data: { ...data, metadata: data.metadata as Prisma.InputJsonObject } });
    });
  }
  private async sources() {
    const [keywords, entities, pages] = await Promise.all([websiteKeywordRepository.list(), websiteEntityRepository.list(), websitePageRepository.list()]);
    return { keywords, entities, pages };
  }
  async opportunities() { const { keywords, entities, pages } = await this.sources(); return deriveOpportunities(keywords, entities, pages); }
  async clusters() { const { keywords, entities } = await this.sources(); return deriveClusters(keywords, entities); }
  async overview() {
    const { keywords, entities, pages } = await this.sources();
    const [activeCompetitors, organicObservations, aiObservations, latest] = await Promise.all([
      prisma.websiteSeoCompetitor.count({ where: { status: "ACTIVE" } }),
      prisma.websiteSeoSearchObservation.count({ where: { kind: "ORGANIC_RANKING" } }),
      prisma.websiteSeoSearchObservation.count({ where: { kind: "AI_VISIBILITY" } }),
      prisma.websiteSeoSearchObservation.findFirst({ orderBy: [{ observedAt: "desc" }, { id: "desc" }], select: { observedAt: true } }),
    ]);
    return { totalKeywords: keywords.length, activeMappedKeywords: keywords.filter((row) => ["ACTIVE", "MAPPED"].includes(row.status)).length,
      clusters: deriveClusters(keywords, entities).length, scoredOpportunities: deriveOpportunities(keywords, entities, pages).filter((row) => row.metrics.opportunityScore !== null).length,
      activeCompetitors, organicObservations, aiObservations, latestObservation: latest?.observedAt ?? null, provider: SEARCH_PROVIDER_STATE };
  }
}
export const searchIntelligenceRepository = new SearchIntelligenceRepository();
