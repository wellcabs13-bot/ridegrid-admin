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
}

export interface AutomationExecutionResponse {
  success: boolean;

  executedRules: number;

  actions: AutomationAction[];

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