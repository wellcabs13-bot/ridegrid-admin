import { NextRequest } from "next/server";

import {
  websiteKeywordRepository,
} from "@/lib/website-seo/keywords";

import type {
  UpdateWebsiteKeywordInput,
} from "@/lib/website-seo/keywords";

function json(
  data: unknown,
  status = 200
) {
  return Response.json(data, { status });
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const keyword =
      await websiteKeywordRepository.findById(id);

    if (!keyword) {
      return json(
        {
          ok: false,
          error: "Keyword not found.",
        },
        404
      );
    }

    return json({
      ok: true,
      data: keyword,
    });
  } catch (error) {
    console.error(
      "[website-seo/keywords/[id] GET]",
      error
    );

    return json(
      {
        ok: false,
        error: "Unable to load keyword.",
      },
      500
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const body =
      (await request.json()) as UpdateWebsiteKeywordInput;

    const keyword =
      await websiteKeywordRepository.update(
        id,
        body
      );

    if (!keyword) {
      return json(
        {
          ok: false,
          error: "Keyword not found.",
        },
        404
      );
    }

    return json({
      ok: true,
      data: keyword,
    });
  } catch (error) {
    console.error(
      "[website-seo/keywords/[id] PATCH]",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to update keyword.";

    return json(
      {
        ok: false,
        error: message,
      },
      400
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const removed =
      await websiteKeywordRepository.remove(id);

    if (!removed) {
      return json(
        {
          ok: false,
          error: "Keyword not found.",
        },
        404
      );
    }

    return json({
      ok: true,
      deleted: true,
    });
  } catch (error) {
    console.error(
      "[website-seo/keywords/[id] DELETE]",
      error
    );

    return json(
      {
        ok: false,
        error: "Unable to delete keyword.",
      },
      500
    );
  }
}