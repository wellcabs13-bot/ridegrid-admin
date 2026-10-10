import { searchIntelligenceRepository as repository } from "@/lib/website-seo/search-intelligence/repository";
import { searchIntelligenceResponse as respond } from "@/lib/website-seo/search-intelligence/http";
import { websiteSeoApiError, websiteSeoApiSuccess } from "@/lib/website-seo/api";
interface Context { params: Promise<{ id: string }> }
export async function GET(_request: Request, context: Context) {
  try { const item = await repository.competitor((await context.params).id); return item ? websiteSeoApiSuccess(item) : websiteSeoApiError("Competitor not found.", 404); }
  catch (error) { return respond(async () => { throw error; }); }
}
export async function PATCH(request: Request, context: Context) { return respond(async () => repository.updateCompetitor((await context.params).id, await request.json())); }
export async function DELETE(_request: Request, context: Context) { return respond(async () => repository.updateCompetitor((await context.params).id, { status: "ARCHIVED" })); }
