import { describe, expect, it } from "vitest";

import {
  backgroundExecutionAllowed,
  nextScheduleAt,
  validateWorkflow,
} from "@/lib/website-seo/automation";

describe("W12 Website SEO Automation", () => {
  it("allows background execution only in AUTOMATIC mode", () => {
    expect(backgroundExecutionAllowed("MANUAL")).toBe(false);
    expect(backgroundExecutionAllowed("ASSISTED")).toBe(false);
    expect(backgroundExecutionAllowed("AUTOMATIC")).toBe(true);
  });

  it("advances daily schedules", () => {
    const start = new Date("2026-09-12T00:00:00.000Z");

    expect(
      nextScheduleAt(start, "DAILY").toISOString()
    ).toBe("2026-09-13T00:00:00.000Z");
  });

  it("advances weekly schedules", () => {
    const start = new Date("2026-09-12T00:00:00.000Z");

    expect(
      nextScheduleAt(start, "WEEKLY").toISOString()
    ).toBe("2026-09-19T00:00:00.000Z");
  });

  it("keeps valid workflow action order", () => {
    const result = validateWorkflow({
      id: "wf-1",
      name: "SEO Package",
      enabled: true,
      actions: [
        "GENERATE_PAGE",
        "GENERATE_KEYWORDS",
        "GENERATE_SEO",
      ],
    });

    expect(result.actions).toEqual([
      "GENERATE_PAGE",
      "GENERATE_KEYWORDS",
      "GENERATE_SEO",
    ]);
  });

  it("rejects workflows without actions", () => {
    expect(() =>
      validateWorkflow({
        id: "wf-1",
        name: "Empty",
        actions: [],
      })
    ).toThrow();
  });

  it("rejects unknown workflow actions", () => {
    expect(() =>
      validateWorkflow({
        id: "wf-1",
        name: "Invalid",
        actions: ["DELETE_EVERYTHING"],
      })
    ).toThrow();
  });
});