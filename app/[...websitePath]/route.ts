import { NextRequest } from "next/server";

import { legacyFallbackResponse } from "@/lib/website-seo/legacy-migration/fallback";
import { legacyMigrationRepository } from "@/lib/website-seo/legacy-migration";
import { publishedPageResponse } from "@/lib/website-seo/publishing/public";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const legacy =
    await legacyMigrationRepository.resolve(pathname);

  if (legacy?.kind === "REDIRECT") {
    const target = new URL(legacy.to, request.url);
    target.search = request.nextUrl.search;

    return new Response(null, {
      status: 308,
      headers: {
        Location: target.toString(),
        "Cache-Control":
          "public, max-age=0, s-maxage=3600",
      },
    });
  }

  if (legacy?.kind === "RETIRE") {
    return new Response("Gone", {
      status: 410,
      headers: {
        "X-Robots-Tag": "noindex",
        "Cache-Control":
          "public, max-age=0, s-maxage=3600",
      },
    });
  }

  const published =
    await publishedPageResponse(pathname);

  if (published.status !== 404) {
    return published;
  }

  const fallback =
    legacyFallbackResponse(pathname);

  return fallback ?? published;
}