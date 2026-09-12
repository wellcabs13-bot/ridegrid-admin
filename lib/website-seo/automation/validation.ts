import type { WebsiteSeoApprovalMode } from "../config";
import {
  WEBSITE_AUTOMATION_ACTIONS,
  WEBSITE_AUTOMATION_CADENCES,
  type WebsiteAutomationAction,
  type WebsiteAutomationCadence,
  type WebsiteAutomationRule,
  type WebsiteAutomationSchedule,
  type WebsiteAutomationWorkflow,
} from "./types";

const MODES: WebsiteSeoApprovalMode[] = [
  "MANUAL",
  "ASSISTED",
  "AUTOMATIC",
];

const ENTITY_TYPES = [
  "ROUTE",
  "CITY",
  "SERVICE",
  "AIRPORT",
  "AREA",
  "VEHICLE",
];

const ENTITY_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "ARCHIVED",
];

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected object.");
  }

  return value as Record<string, unknown>;
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function booleanValue(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function isAutomationMode(
  value: unknown
): value is WebsiteSeoApprovalMode {
  return typeof value === "string" &&
    MODES.includes(value as WebsiteSeoApprovalMode);
}

export function isAutomationAction(
  value: unknown
): value is WebsiteAutomationAction {
  return typeof value === "string" &&
    (WEBSITE_AUTOMATION_ACTIONS as readonly string[]).includes(value);
}

export function isAutomationCadence(
  value: unknown
): value is WebsiteAutomationCadence {
  return typeof value === "string" &&
    (WEBSITE_AUTOMATION_CADENCES as readonly string[]).includes(value);
}

export function backgroundExecutionAllowed(
  mode: WebsiteSeoApprovalMode
): boolean {
  return mode === "AUTOMATIC";
}

export function nextScheduleAt(
  from: Date,
  cadence: WebsiteAutomationCadence
): Date {
  const next = new Date(from);

  if (cadence === "DAILY") {
    next.setUTCDate(next.getUTCDate() + 1);
  } else if (cadence === "WEEKLY") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }

  return next;
}

export function validateWorkflow(
  value: unknown
): WebsiteAutomationWorkflow {
  const input = record(value);

  const rawActions = input.actions;

  if (!Array.isArray(rawActions) || rawActions.length === 0) {
    throw new Error("Workflow requires at least one action.");
  }

  const actions = rawActions.map((action) => {
    if (!isAutomationAction(action)) {
      throw new Error("Invalid automation action.");
    }

    return action;
  });

  const now = new Date().toISOString();

  return {
    id: requiredText(input.id, "Workflow id"),
    name: requiredText(input.name, "Workflow name"),
    enabled: booleanValue(input.enabled),
    actions: [...new Set(actions)],
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt
        : now,
    updatedAt: now,
  };
}

export function validateRule(
  value: unknown
): WebsiteAutomationRule {
  const input = record(value);
  const now = new Date().toISOString();

  const entityType =
    input.entityType === null || input.entityType === undefined
      ? null
      : requiredText(input.entityType, "Entity type");

  if (entityType && !ENTITY_TYPES.includes(entityType)) {
    throw new Error("Invalid rule entity type.");
  }

  const entityStatus =
    input.entityStatus === null || input.entityStatus === undefined
      ? null
      : requiredText(input.entityStatus, "Entity status");

  if (entityStatus && !ENTITY_STATUSES.includes(entityStatus)) {
    throw new Error("Invalid rule entity status.");
  }

  return {
    id: requiredText(input.id, "Rule id"),
    name: requiredText(input.name, "Rule name"),
    enabled: booleanValue(input.enabled),
    workflowId: requiredText(input.workflowId, "Workflow id"),
    entityType:
      entityType as WebsiteAutomationRule["entityType"],
    entityStatus:
      entityStatus as WebsiteAutomationRule["entityStatus"],
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt
        : now,
    updatedAt: now,
  };
}

export function validateSchedule(
  value: unknown
): WebsiteAutomationSchedule {
  const input = record(value);
  const now = new Date().toISOString();

  if (!isAutomationCadence(input.cadence)) {
    throw new Error("Invalid automation cadence.");
  }

  const nextRunAt =
    requiredText(input.nextRunAt, "Next run");

  if (!Number.isFinite(Date.parse(nextRunAt))) {
    throw new Error("Invalid next run date.");
  }

  return {
    id: requiredText(input.id, "Schedule id"),
    name: requiredText(input.name, "Schedule name"),
    enabled: booleanValue(input.enabled),
    workflowId: requiredText(input.workflowId, "Workflow id"),
    entityId: requiredText(input.entityId, "Entity id"),
    cadence: input.cadence,
    nextRunAt: new Date(nextRunAt).toISOString(),
    lastRunAt:
      typeof input.lastRunAt === "string"
        ? input.lastRunAt
        : null,
    lastOutcome:
      input.lastOutcome === "COMPLETED" ||
      input.lastOutcome === "FAILED" ||
      input.lastOutcome === "BLOCKED"
        ? input.lastOutcome
        : null,
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt
        : now,
    updatedAt: now,
  };
}