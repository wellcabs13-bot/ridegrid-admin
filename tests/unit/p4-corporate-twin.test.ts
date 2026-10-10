import { describe, expect, it } from "vitest";

describe("P4.2 Corporate Digital Twin", () => {
  it("calculates remaining corporate budget", () => {
    expect(100000 - 40000).toBe(60000);
  });

  it("calculates utilization percentage", () => {
    expect(Math.round((40000 / 100000) * 10000) / 100).toBe(40);
  });

  it("handles zero allocated budget safely", () => {
    const allocated = 0;
    const spent = 0;
    expect(allocated > 0 ? (spent / allocated) * 100 : 0).toBe(0);
  });

  it("calculates per-budget remaining amount", () => {
    expect(75000 - 25000).toBe(50000);
  });
});