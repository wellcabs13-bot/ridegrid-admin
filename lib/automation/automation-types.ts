import {
  AutomationAction,
  AutomationRule,
  AutomationTrigger,
} from "@/types/automation";

export interface AutomationContext {
  module: string;

  userId?: string;

  bookingId?: string;

  vendorId?: string;

  driverId?: string;

  customerId?: string;

  metadata?: Record<string, unknown>;
}

export interface AutomationExecutionRequest {
  trigger: AutomationTrigger;

  context: AutomationContext;

  // Rules that already ran for this event (set on retry so they do not run twice).
  completedRuleIds?: string[];
}

export interface AutomationRuleResult {
  ruleId: string;

  status: "EXECUTED" | "FAILED" | "SKIPPED_DISABLED" | "ALREADY_COMPLETED";

  notified?: number;

  error?: string;
}

export interface AutomationExecutionResponse {
  success: boolean;

  executedRules: number;

  actions: AutomationAction[];

  results: AutomationRuleResult[];

  message: string;
}

export interface AutomationProvider {
  execute(
    request: AutomationExecutionRequest
  ): Promise<AutomationExecutionResponse>;
}

export interface AutomationRegistry {
  rules: AutomationRule[];
}
