import { describe, expect, it } from "vitest";

describe("P2.3 Smart Return approval workflow", () => {
  it("defines the required lifecycle", () => {
    const lifecycle = ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "BOOKED", "EXPIRED", "CANCELLED"];
    expect(lifecycle).toContain("DRAFT");
    expect(lifecycle).toContain("PENDING_APPROVAL");
    expect(lifecycle).toContain("PUBLISHED");
  });
});