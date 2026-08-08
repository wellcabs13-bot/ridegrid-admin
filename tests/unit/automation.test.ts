import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getAutomationRules,
} from "@/lib/automation/automation-rules";

import {
  AutomationTrigger,
} from "@/types/automation";

describe("RideGrid Automation", () => {
  it("returns active booking-created rules", () => {
    const rules =
      getAutomationRules(
        AutomationTrigger.BOOKING_CREATED
      );

    expect(
      Array.isArray(rules)
    ).toBe(true);

    expect(
      rules.every(
        (rule) =>
          rule.enabled
      )
    ).toBe(true);
  });

  it("returns document expiry rules", () => {
    const rules =
      getAutomationRules(
        AutomationTrigger.DOCUMENT_EXPIRY
      );

    expect(
      Array.isArray(rules)
    ).toBe(true);
  });
});