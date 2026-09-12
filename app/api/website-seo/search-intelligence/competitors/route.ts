import { searchIntelligenceRepository as repository } from "@/lib/website-seo/search-intelligence/repository";
import { queryChoice, searchIntelligenceResponse as respond } from "@/lib/website-seo/search-intelligence/http";
import { COMPETITOR_STATUSES } from "@/lib/website-seo/search-intelligence/types";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return respond(async () => { const params = new URL(request.url).searchParams; return repository.competitors(params.get("search")?.trim(), queryChoice(params, "status", COMPETITOR_STATUSES)); });
}
export async function POST(request: Request) { return respond(async () => repository.createCompetitor(await request.json()), 201); }
