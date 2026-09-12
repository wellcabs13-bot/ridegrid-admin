import { NextRequest } from "next/server";

import {
  websiteKeywordRepository,
  isWebsiteKeywordIntent,
  isWebsiteKeywordStatus,
  isWebsiteKeywordType,
} from "@/lib/website-seo/keywords";

import type {
  CreateWebsiteKeywordInput,
  WebsiteKeywordIntent,
  WebsiteKeywordStatus,
  WebsiteKeywordType,
} from "@/lib/website-seo/keywords";

function json(
  data: unknown,
  status = 200
) {
  return Response.json(data, { status });
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    const rawType = params.get("type");
    const rawIntent = params.get("intent");
    const rawStatus = params.get("status");

    let type: WebsiteKeywordType | undefined;
    let intent: WebsiteKeywordIntent | undefined;
    let status: WebsiteKeywordStatus | undefined;

    if (rawType) {
      if (!isWebsiteKeywordType(rawType)) {
        return json(
          { ok: false, error: "Invalid keyword type." },
          400
        );
      }

      type = rawType;
    }

    if (rawIntent) {
      if (!isWebsiteKeywordIntent(rawIntent)) {
        return json(
          { ok: false, error: "Invalid keyword intent." },
          400
        );
      }

      intent = rawIntent;
    }

    if (rawStatus) {
      if (!isWebsiteKeywordStatus(rawStatus)) {
        return json(
          { ok: false, error: "Invalid keyword status." },
          400
        );
      }

      status = rawStatus;
    }

    const keywords =
      await websiteKeywordRepository.list({
        search:
          params.get("search") ?? undefined,
        type,
        intent,
        status,
        entityId:
          params.get("entityId") ?? undefined,
        entityType:
          params.get("entityType") ?? undefined,
        clusterKey:
          params.get("clusterKey") ?? undefined,
      });

    return json({
      ok: true,
      data: keywords,
      count: keywords.length,
    });
  } catch (error) {
    console.error(
      "[website-seo/keywords GET]",
      error
    );

    return json(
      {
        ok: false,
        error: "Unable to load keywords.",
      },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body =
      (await request.json()) as CreateWebsiteKeywordInput;

    const existing =
      await websiteKeywordRepository.findByNormalizedKeyword(
        body.keyword ?? "",
        body.entityId
      );

    if (existing) {
      return json(
        {
          ok: false,
          error:
            "Keyword already exists for this entity.",
        },
        409
      );
    }

    const keyword =
      await websiteKeywordRepository.create(body);

    return json(
      {
        ok: true,
        data: keyword,
      },
      201
    );
  } catch (error) {
    console.error(
      "[website-seo/keywords POST]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to create keyword.";

    return json(
      {
        ok: false,
        error: message,
      },
      400
    );
  }
}