import { NextRequest } from "next/server";

import {
  isAutomationMode,
  validateRule,
  validateSchedule,
  validateWorkflow,
  websiteAutomationRepository,
} from "@/lib/website-seo/automation";

export async function GET() {
  const data =
    await websiteAutomationRepository.load();

  return Response.json({
    ok: true,
    data,
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      (await request.json()) as Record<string, unknown>;

    const operation =
      typeof body.operation === "string"
        ? body.operation
        : "";

    const state =
      await websiteAutomationRepository.load();

    if (operation === "SET_MODE") {
      if (!isAutomationMode(body.mode)) {
        return Response.json(
          {
            ok: false,
            error: "Invalid approval mode.",
          },
          { status: 400 }
        );
      }

      state.approvalMode = body.mode;
    } else if (operation === "UPSERT_WORKFLOW") {
      const workflow =
        validateWorkflow(body.workflow);

      state.workflows = [
        workflow,
        ...state.workflows.filter(
          (item) =>
            item.id !== workflow.id
        ),
      ];
    } else if (operation === "DELETE_WORKFLOW") {
      const id =
        typeof body.id === "string"
          ? body.id.trim()
          : "";

      if (!id) {
        throw new Error(
          "Workflow id is required."
        );
      }

      if (
        state.rules.some(
          (rule) =>
            rule.workflowId === id
        ) ||
        state.schedules.some(
          (schedule) =>
            schedule.workflowId === id
        )
      ) {
        throw new Error(
          "Workflow is referenced by a rule or schedule."
        );
      }

      state.workflows =
        state.workflows.filter(
          (item) => item.id !== id
        );
    } else if (operation === "UPSERT_RULE") {
      const rule =
        validateRule(body.rule);

      if (
        !state.workflows.some(
          (workflow) =>
            workflow.id === rule.workflowId
        )
      ) {
        throw new Error(
          "Rule workflow does not exist."
        );
      }

      state.rules = [
        rule,
        ...state.rules.filter(
          (item) =>
            item.id !== rule.id
        ),
      ];
    } else if (operation === "DELETE_RULE") {
      const id =
        typeof body.id === "string"
          ? body.id.trim()
          : "";

      state.rules =
        state.rules.filter(
          (item) => item.id !== id
        );
    } else if (operation === "UPSERT_SCHEDULE") {
      const schedule =
        validateSchedule(body.schedule);

      if (
        !state.workflows.some(
          (workflow) =>
            workflow.id ===
            schedule.workflowId
        )
      ) {
        throw new Error(
          "Schedule workflow does not exist."
        );
      }

      state.schedules = [
        schedule,
        ...state.schedules.filter(
          (item) =>
            item.id !== schedule.id
        ),
      ];
    } else if (operation === "DELETE_SCHEDULE") {
      const id =
        typeof body.id === "string"
          ? body.id.trim()
          : "";

      state.schedules =
        state.schedules.filter(
          (item) => item.id !== id
        );
    } else {
      return Response.json(
        {
          ok: false,
          error: "Unknown automation operation.",
        },
        { status: 400 }
      );
    }

    await websiteAutomationRepository.save(
      state
    );

    return Response.json({
      ok: true,
      data: state,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Automation configuration failed.",
      },
      { status: 400 }
    );
  }
}