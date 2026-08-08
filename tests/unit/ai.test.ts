import {
  describe,
  expect,
  it,
} from "vitest";

import {
  sanitizePrompt,
} from "@/lib/ai/ai-utils";

describe("RideGrid AI", () => {
  it("sanitizes AI prompts", () => {
    const result =
      sanitizePrompt(
        "  Analyze booking demand.  "
      );

    expect(result).toBe(
      "Analyze booking demand."
    );
  });

  it("handles empty prompts", () => {
    const result =
      sanitizePrompt("   ");

    expect(result).toBe("");
  });
});