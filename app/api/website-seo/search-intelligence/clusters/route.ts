import { searchIntelligenceRepository } from "@/lib/website-seo/search-intelligence/repository";
import { searchIntelligenceResponse } from "@/lib/website-seo/search-intelligence/http";
export const dynamic = "force-dynamic";
export async function GET() { return searchIntelligenceResponse(() => searchIntelligenceRepository.clusters()); }
