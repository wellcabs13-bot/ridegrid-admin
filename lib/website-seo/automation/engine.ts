import { randomUUID } from "node:crypto";

import { eventBus } from "@/lib/events/event-bus";

import { websiteSeoConfig } from "../config";
import { websiteEntityRepository } from "../entities/repository";
import { keywordIntelligenceEngine } from "../keywords/engine";
import {
  websitePageGenerationService,
} from "../pages";
import { websitePageRepository } from "../pages/repository";
import { websiteContentEngine } from "../content/engine";
import { websiteSeoEngine } from "../seo/engine";
import { publishingIndexingEngine } from "../publishing/engine";

import {
  backgroundExecutionAllowed,
  nextScheduleAt,
} from "./validation";

import { websiteAutomationRepository } from "./repository";

import type {
  WebsiteAutomationActivity,
  WebsiteAutomationAction,
  WebsiteAutomationStep,
  WebsiteAutomationTrigger,
} from "./types";

async function resolvePage(entityId: string) {
  const pages = await websitePageRepository.list({ entityId });

  const usable = pages.filter(
    (page) => page.status !== "ARCHIVED"
  );

  if (usable.length === 0) {
    throw new Error(
      "Generated page required before this automation step."
    );
  }

  if (usable.length > 1) {
    throw new Error(
      "Multiple generated pages exist for this entity. Use explicit manual page management."
    );
  }

  return usable[0];
}

async function runAction(
  action: WebsiteAutomationAction,
  entityId: string
): Promise<WebsiteAutomationStep> {
  if (action === "GENERATE_PAGE") {
    await websitePageGenerationService.generateAndPersist({
      entityId,
    });

    return {
      action,
      status: "COMPLETED",
      message: "Page generation completed.",
    };
  }

  if (action === "GENERATE_KEYWORDS") {
    await keywordIntelligenceEngine.generate(entityId, true);

    return {
      action,
      status: "COMPLETED",
      message: "Keyword generation completed.",
    };
  }

  const page = await resolvePage(entityId);

  if (action === "GENERATE_CONTENT") {
    await websiteContentEngine.generate({
      entityId,
      pageId: page.id,
      persist: true,
    });

    return {
      action,
      status: "COMPLETED",
      message: "Content generation completed.",
    };
  }

  if (action === "GENERATE_SEO") {
    await websiteSeoEngine.generate({
      entityId,
      pageId: page.id,
      persist: true,
    });

    return {
      action,
      status: "COMPLETED",
      message: "SEO generation completed.",
    };
  }

  if (action === "READINESS_PREVIEW") {
    const result =
      await publishingIndexingEngine.publish(
        entityId,
        page.id,
        true
      );

    return {
      action,
      status:
        result.readiness.ready
          ? "COMPLETED"
          : "BLOCKED",
      message:
        result.readiness.ready
          ? "Publication readiness passed."
          : `Readiness blocked: ${result.readiness.reasonCodes.join(", ")}`,
    };
  }

  if (action === "PUBLISH_PAGE") {
    if (!websiteSeoConfig.publishingEnabled) {
      return {
        action,
        status: "BLOCKED",
        message:
          "Automatic publishing is disabled by the central Website SEO configuration.",
      };
    }

    const result =
      await publishingIndexingEngine.publish(
        entityId,
        page.id
      );

    if (result.activity?.outcome === "BLOCKED") {
      return {
        action,
        status: "BLOCKED",
        message: "W7 publication guardrails blocked publication.",
      };
    }

    return {
      action,
      status: "COMPLETED",
      message: "W7 publication operation completed.",
    };
  }

  await publishingIndexingEngine.sync(
    entityId,
    page.id
  );

  return {
    action,
    status: "COMPLETED",
    message: "Discovery synchronization completed.",
  };
}

export const websiteAutomationEngine = {
  async runWorkflow(
    workflowId: string,
    entityId: string,
    trigger: WebsiteAutomationTrigger = "MANUAL"
  ) {
    const state =
      await websiteAutomationRepository.load();

    const workflow =
      state.workflows.find(
        (candidate) =>
          candidate.id === workflowId
      );

    if (!workflow || !workflow.enabled) {
      throw new Error(
        "Automation workflow not found or disabled."
      );
    }

    if (
      trigger !== "MANUAL" &&
      !backgroundExecutionAllowed(
        state.approvalMode
      )
    ) {
      const blocked: WebsiteAutomationActivity = {
        id: randomUUID(),
        workflowId: workflow.id,
        workflowName: workflow.name,
        entityId,
        trigger,
        status: "BLOCKED",
        steps: [],
        occurredAt: new Date().toISOString(),
        error:
          "Background execution requires AUTOMATIC approval mode.",
      };

      await websiteAutomationRepository.recordActivity(
        blocked
      );

      return blocked;
    }

    const entity =
      await websiteEntityRepository.findById(
        entityId
      );

    if (!entity) {
      throw new Error("Website entity not found.");
    }

    const steps: WebsiteAutomationStep[] = [];

    try {
      for (const action of workflow.actions) {
        const step =
          await runAction(
            action,
            entityId
          );

        steps.push(step);

        if (
          step.status === "FAILED" ||
          step.status === "BLOCKED"
        ) {
          const blocked: WebsiteAutomationActivity = {
            id: randomUUID(),
            workflowId: workflow.id,
            workflowName: workflow.name,
            entityId,
            trigger,
            status:
              step.status === "BLOCKED"
                ? "BLOCKED"
                : "FAILED",
            steps,
            occurredAt:
              new Date().toISOString(),
            error: step.message,
          };

          await websiteAutomationRepository.recordActivity(
            blocked
          );

          await eventBus.publish(
            "website-seo",
            "website-seo.automation.blocked",
            blocked
          );

          return blocked;
        }
      }

      const completed: WebsiteAutomationActivity = {
        id: randomUUID(),
        workflowId: workflow.id,
        workflowName: workflow.name,
        entityId,
        trigger,
        status: "COMPLETED",
        steps,
        occurredAt: new Date().toISOString(),
        error: null,
      };

      await websiteAutomationRepository.recordActivity(
        completed
      );

      await eventBus.publish(
        "website-seo",
        "website-seo.automation.completed",
        completed
      );

      return completed;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Automation workflow failed.";

      const failed: WebsiteAutomationActivity = {
        id: randomUUID(),
        workflowId: workflow.id,
        workflowName: workflow.name,
        entityId,
        trigger,
        status: "FAILED",
        steps,
        occurredAt: new Date().toISOString(),
        error: message,
      };

      await websiteAutomationRepository.recordActivity(
        failed
      );

      await eventBus.publish(
        "website-seo",
        "website-seo.automation.failed",
        failed
      );

      return failed;
    }
  },

  async evaluateRule(
    ruleId: string,
    entityId: string
  ) {
    const state =
      await websiteAutomationRepository.load();

    const rule =
      state.rules.find(
        (candidate) =>
          candidate.id === ruleId
      );

    if (!rule || !rule.enabled) {
      throw new Error(
        "Automation rule not found or disabled."
      );
    }

    const entity =
      await websiteEntityRepository.findById(
        entityId
      );

    if (!entity) {
      throw new Error("Website entity not found.");
    }

    if (
      rule.entityType &&
      rule.entityType !== entity.type
    ) {
      throw new Error(
        "Entity does not satisfy the rule entity type."
      );
    }

    if (
      rule.entityStatus &&
      rule.entityStatus !== entity.status
    ) {
      throw new Error(
        "Entity does not satisfy the rule status."
      );
    }

    return this.runWorkflow(
      rule.workflowId,
      entityId,
      "RULE"
    );
  },

  async runDueSchedules() {
    const state =
      await websiteAutomationRepository.load();

    if (
      !backgroundExecutionAllowed(
        state.approvalMode
      )
    ) {
      return {
        processed: 0,
        blocked: true,
        reason:
          "Due schedules execute only in AUTOMATIC approval mode.",
        results: [],
      };
    }

    const now = new Date();

    const due = state.schedules
      .filter(
        (schedule) =>
          schedule.enabled &&
          Date.parse(schedule.nextRunAt) <=
            now.getTime()
      )
      .slice(0, 10);

    const results = [];

    for (const schedule of due) {
      const result =
        await this.runWorkflow(
          schedule.workflowId,
          schedule.entityId,
          "SCHEDULE"
        );

      await websiteAutomationRepository.updateScheduleRun(
        schedule.id,
        {
          lastRunAt: now.toISOString(),
          lastOutcome: result.status,
          nextRunAt:
            nextScheduleAt(
              now,
              schedule.cadence
            ).toISOString(),
        }
      );

      results.push({
        scheduleId: schedule.id,
        result,
      });
    }

    return {
      processed: results.length,
      blocked: false,
      results,
    };
  },
};