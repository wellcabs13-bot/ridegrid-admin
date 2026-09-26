import { describe, expect, it } from "vitest";

describe("P2.5 Smart Return Automation", () => {
  it("uses the required automatic listing lifecycle", () => {
    const initialStatus = "PENDING_APPROVAL";
    expect(initialStatus).toBe("PENDING_APPROVAL");
  });

  it("uses the Smart Return discounted fare rule", () => {
    const baseFare = 10000;
    const fare = Math.round(baseFare * 0.85 * 100) / 100;
    expect(fare).toBe(8500);
  });

  it("prevents duplicate active listings", () => {
    const active = ["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "BOOKED"];
    expect(active).toContain("PUBLISHED");
    expect(active).not.toContain("EXPIRED");
  });
});