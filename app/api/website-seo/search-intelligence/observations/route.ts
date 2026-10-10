import { searchIntelligenceRepository as repository } from "@/lib/website-seo/search-intelligence/repository";
import { queryChoice, pageNumber, searchIntelligenceResponse as respond } from "@/lib/website-seo/search-intelligence/http";
import { OBSERVATION_KINDS, OBSERVATION_SUBJECTS } from "@/lib/website-seo/search-intelligence/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return respond(async () => {
    const params = new URL(request.url).searchParams;
    return repository.observations({ kind: queryChoice(params, "kind", OBSERVATION_KINDS), subject: queryChoice(params, "subject", OBSERVATION_SUBJECTS),
      search: params.get("search")?.trim(), competitorId: params.get("competitorId") || undefined, keywordId: params.get("keywordId") || undefined, pageId: params.get("pageId") || undefined,
      offset: pageNumber(params, "offset", 0, 1000000), limit: pageNumber(params, "limit", 50, 100) });
  });
}
export async function POST(request: Request) { return respond(async () => repository.createObservation(await request.json()), 201); }
