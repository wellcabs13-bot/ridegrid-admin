import { NextRequest } from "next/server";
import { publishedPageResponse } from "@/lib/website-seo/publishing/public";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return publishedPageResponse(request.nextUrl.pathname); }
