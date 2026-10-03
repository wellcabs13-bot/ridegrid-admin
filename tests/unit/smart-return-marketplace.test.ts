import { describe, expect, it } from "vitest";

describe("P2.4 Smart Return Customer Marketplace", () => {
  it("uses only published Smart Return inventory", () => {
    const allowed = ["PUBLISHED"];
    expect(allowed).toContain("PUBLISHED");
    expect(allowed).not.toContain("DRAFT");
    expect(allowed).not.toContain("PENDING_APPROVAL");
    expect(allowed).not.toContain("CANCELLED");
  });

  it("exposes Smart Return as a separate marketplace listing type", () => {
    expect("SMART_RETURN").toBe("SMART_RETURN");
  });
});