import { NextRequest } from "next/server";

import {
  getAiControlSnapshot,
  validateApprovalMode,
  validateGenerationRules,
  validateStrategy,
  websiteSeoAiControlRepository,
} from "@/lib/website-seo/ai-control";

export async function GET() {
  try {
    return Response.json({
      ok: true,
      data:
        await getAiControlSnapshot(),
    });
  } catch (error) {
    console.error(
      "[website-seo/ai-control GET]",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load AI controls.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as Record<
        string,
        unknown
      >;

    const operation =
      typeof body.operation === "string"
        ? body.operation
        : "";

    const state =
      await websiteSeoAiControlRepository.load();

    if (
      operation ===
      "UPDATE_STRATEGY"
    ) {
      state.strategy =
        validateStrategy(body.strategy);
    } else if (
      operation ===
      "UPDATE_GENERATION_RULES"
    ) {
      state.generationRules =
        validateGenerationRules(
          body.generationRules
        );
    } else if (
      operation ===
      "SET_APPROVAL_MODE"
    ) {
      state.approvalMode =
        validateApprovalMode(
          body.approvalMode
        );
    } else {
      return Response.json(
        {
          ok: false,
          error:
            "Unknown AI control operation.",
        },
        { status: 400 }
      );
    }

    await websiteSeoAiControlRepository.save(
      state
    );

    return Response.json({
      ok: true,
      data:
        await getAiControlSnapshot(),
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update AI controls.",
      },
      { status: 400 }
    );
  }
}