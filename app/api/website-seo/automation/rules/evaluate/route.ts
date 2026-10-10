import { NextRequest } from "next/server";
import { websiteAutomationEngine } from "@/lib/website-seo/automation";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as Record<string, unknown>;

    if (
      typeof body.ruleId !== "string" ||
      !body.ruleId.trim() ||
      typeof body.entityId !== "string" ||
      !body.entityId.trim()
    ) {
      return Response.json(
        {
          ok: false,
          error: "ruleId and entityId are required.",
        },
        { status: 400 }
      );
    }

    const data =
      await websiteAutomationEngine.evaluateRule(
        body.ruleId.trim(),
        body.entityId.trim()
      );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Rule evaluation failed.",
      },
      { status: 400 }
    );
  }
}