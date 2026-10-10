import { performanceResponse } from "@/lib/website-seo/performance/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return performanceResponse(request, "pages"); }

