import type { WebsiteSeoApprovalMode } from "../config";
import type { WebsiteEntityType } from "../entities";

export const WEBSITE_AUTOMATION_ACTIONS = [
  "GENERATE_PAGE",
  "GENERATE_KEYWORDS",
  "GENERATE_CONTENT",
  "GENERATE_SEO",
  "READINESS_PREVIEW",
  "PUBLISH_PAGE",
  "SYNC_DISCOVERY",
] as const;

export type WebsiteAutomationAction =
  (typeof WEBSITE_AUTOMATION_ACTIONS)[number];

export const WEBSITE_AUTOMATION_CADENCES = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
] as const;

export type WebsiteAutomationCadence =
  (typeof WEBSITE_AUTOMATION_CADENCES)[number];

export type WebsiteAutomationTrigger =
  | "MANUAL"
  | "RULE"
  | "SCHEDULE";

export type WebsiteAutomationRunStatus =
  | "COMPLETED"
  | "FAILED"
  | "BLOCKED";

export interface WebsiteAutomationWorkflow {
  id: string;
  name: string;
  enabled: boolean;
  actions: WebsiteAutomationAction[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteAutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  workflowId: string;
  entityType: WebsiteEntityType | null;
  entityStatus: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED" | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteAutomationSchedule {
  id: string;
  name: string;
  enabled: boolean;
  workflowId: string;
  entityId: string;
  cadence: WebsiteAutomationCadence;
  nextRunAt: string;
  lastRunAt: string | null;
  lastOutcome: WebsiteAutomationRunStatus | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteAutomationStep {
  action: WebsiteAutomationAction;
  status: "COMPLETED" | "FAILED" | "BLOCKED";
  message: string;
}

export interface WebsiteAutomationActivity {
  id: string;
  workflowId: string;
  workflowName: string;
  entityId: string;
  trigger: WebsiteAutomationTrigger;
  status: WebsiteAutomationRunStatus;
  steps: WebsiteAutomationStep[];
  occurredAt: string;
  error: string | null;
}

export interface WebsiteAutomationState {
  version: 1;
  approvalMode: WebsiteSeoApprovalMode;
  workflows: WebsiteAutomationWorkflow[];
  rules: WebsiteAutomationRule[];
  schedules: WebsiteAutomationSchedule[];
  activity: WebsiteAutomationActivity[];
  failures: WebsiteAutomationActivity[];
}