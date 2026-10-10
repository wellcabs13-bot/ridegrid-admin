// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildAlignmentIssues } from "@/lib/services/pricing/alignment";

const rate = (id: string, service: string, driverId: string) => ({ id, service, terms: { operational: { vehicleId: "car1", driverId, driverName: "Atharva" } } });

describe("rate / driver alignment diagnostics", () => {
  it("reports nothing when the pinned driver is still assigned", () => {
    expect(buildAlignmentIssues([rate("r1", "LOCAL_HOURLY", "d1")], [{ id: "car1", driverId: "d1", registrationNumber: "MH12" }])).toEqual([]);
  });
  it("groups misaligned approved rates per vehicle and explains the action", () => {
    const issues = buildAlignmentIssues([rate("r1", "LOCAL_HOURLY", "d1"), rate("r2", "OUTSTATION_ONE_WAY", "d1")], [{ id: "car1", driverId: "d2", registrationNumber: "MH12" }]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ vehicleId: "car1", reason: "DRIVER_CHANGED", pinnedDriverId: "d1", currentDriverId: "d2", rateVersionIds: ["r1", "r2"], services: ["LOCAL_HOURLY", "OUTSTATION_ONE_WAY"] });
    expect(issues[0].action).toMatch(/not changed automatically/);
  });
  it("flags a vehicle whose driver was removed", () => {
    expect(buildAlignmentIssues([rate("r1", "LOCAL_HOURLY", "d1")], [{ id: "car1", driverId: null, registrationNumber: null }])[0].reason).toBe("NO_DRIVER");
  });
  it("ignores rates without an operational pin and vehicles that no longer exist", () => {
    expect(buildAlignmentIssues([{ id: "r", service: "X", terms: {} }, rate("r2", "X", "d1")], [])).toEqual([]);
  });
});
