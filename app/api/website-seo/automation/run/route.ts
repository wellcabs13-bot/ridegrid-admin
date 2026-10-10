import { NextRequest } from "next/server";
import { websiteAutomationEngine } from "@/lib/website-seo/automation";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as Record<string, unknown>;

    if (
      typeof body.workflowId !== "string" ||
      !body.workflowId.trim() ||
      typeof body.entityId !== "string" ||
      !body.entityId.trim()
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "workflowId and entityId are required.",
        },
        { status: 400 }
      );
    }

    const data =
      await websiteAutomationEngine.runWorkflow(
        body.workflowId.trim(),
        body.entityId.trim(),
        "MANUAL"
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
            : "Automation execution failed.",
      },
      { status: 400 }
    );
  }
}