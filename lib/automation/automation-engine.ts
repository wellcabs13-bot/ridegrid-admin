import {
  AutomationExecutionRequest,
  AutomationExecutionResponse,
} from "./automation-types";

import { automationRules } from "./automation-rules";

export class AutomationEngine {
  async execute(
    request: AutomationExecutionRequest
  ): Promise<AutomationExecutionResponse> {
    const matchedRules = automationRules.filter(
      (rule) =>
        rule.enabled &&
        rule.trigger === request.trigger
    );

    for (const rule of matchedRules) {
      console.info(
        `[Automation] Executing ${rule.name}`
      );

      /**
       * Future
       *
       * Send Email
       * Send SMS
       * Send WhatsApp
       * Push Notification
       * AI Action
       * API Call
       * Queue Job
       */
    }

    return {
      success: true,

      executedRules: matchedRules.length,

      actions: matchedRules.map(
        (r) => r.action
      ),

      message: "Automation completed.",
    };
  }
}

export const automationEngine =
  new AutomationEngine();