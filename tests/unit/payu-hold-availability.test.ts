// @vitest-environment node
import { beforeEach, describe, it, expect, vi } from "vitest";

// A tiny where-clause interpreter covering exactly the operators
// BookingAvailabilityService actually emits (deletedAt, id.not, pickupDateTime.lt,
// status/.in, holdExpiresAt null/.gt, vehicleId/driverId, AND/OR arrays). This lets the
// test run findBookingConflict/findUnavailableAssignments against real in-memory rows
// through their real Prisma where clause, instead of only asserting the clause's shape.
function matches(row: Record<string, any>, where: any): boolean {
  if (where == null) return true;
  // Every key in the same where-object is ANDed together, including AND/OR keys
  // that sit alongside plain field conditions (e.g. {status: X, OR: [...]}).
  for (const [key, condition] of Object.entries(where)) {
    if (key === "AND") {
      if (!(condition as any[]).every((w) => matches(row, w))) return false;
      continue;
    }
    if (key === "OR") {
      if (!(condition as any[]).some((w) => matches(row, w))) return false;
      continue;
    }
    const value = row[key];
    if (condition && typeof condition === "object" && !(condition instanceof Date)) {
      if ("in" in condition) { if (!condition.in.includes(value)) return false; continue; }
      if ("not" in condition) { if (value === condition.not) return false; continue; }
      if ("lt" in condition) { if (!(value < condition.lt)) return false; continue; }
      if ("gt" in condition) { if (!(value != null && value > condition.gt)) return false; continue; }
      continue;
    }
    if (condition === null) { if (value !== null) return false; continue; }
    if (value !== condition) return false;
  }
  return true;
}

const mocks = vi.hoisted(() => ({ rows: [] as any[] }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: vi.fn(async ({ where }: any) => mocks.rows.filter((r) => matches(r, where))),
    },
  },
}));

import {
  findBookingConflict,
  findUnavailableAssignments,
  reservationWindowFromDate,
} from "@/lib/services/marketplace/BookingAvailabilityService";
import { prisma } from "@/lib/prisma";

const window = reservationWindowFromDate("2027-03-01", 1);

function row(overrides: Partial<Record<string, any>>) {
  return {
    id: "b1", bookingNumber: "RG1", vehicleId: "vehicle-1", driverId: "driver-1",
    pickupDateTime: new Date("2027-03-01T10:00:00+05:30"), reservedFrom: window.start, reservedUntil: window.end,
    tripDays: 1, priceSnapshot: null, deletedAt: null, status: "CONFIRMED", holdExpiresAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.rows.length = 0;
});

describe("availability treats an unexpired PayU hold as blocking", () => {
  it("findBookingConflict reports a conflict for an AWAITING_PAYMENT booking whose hold has not expired", async () => {
    mocks.rows.push(row({ id: "hold-1", status: "AWAITING_PAYMENT", holdExpiresAt: new Date(Date.now() + 10 * 60_000) }));

    const conflict = await findBookingConflict(prisma, { vehicleId: "vehicle-1", window });

    expect(conflict).not.toBeNull();
    expect(conflict?.vehicleConflict).toBe(true);
  });

  it("findUnavailableAssignments marks the vehicle unavailable for an unexpired hold", async () => {
    mocks.rows.push(row({ id: "hold-1", status: "AWAITING_PAYMENT", holdExpiresAt: new Date(Date.now() + 10 * 60_000) }));

    const result = await findUnavailableAssignments(prisma, { vehicleIds: ["vehicle-1"], driverIds: [], window });

    expect(result.unavailableVehicleIds.has("vehicle-1")).toBe(true);
  });
});

describe("availability releases an abandoned PayU hold once it expires", () => {
  it("findBookingConflict ignores an AWAITING_PAYMENT booking whose hold has already expired", async () => {
    mocks.rows.push(row({ id: "hold-1", status: "AWAITING_PAYMENT", holdExpiresAt: new Date(Date.now() - 60_000) }));

    const conflict = await findBookingConflict(prisma, { vehicleId: "vehicle-1", window });

    expect(conflict).toBeNull();
  });

  it("findUnavailableAssignments frees the vehicle once its only hold has expired", async () => {
    mocks.rows.push(row({ id: "hold-1", status: "AWAITING_PAYMENT", holdExpiresAt: new Date(Date.now() - 60_000) }));

    const result = await findUnavailableAssignments(prisma, { vehicleIds: ["vehicle-1"], driverIds: [], window });

    expect(result.unavailableVehicleIds.has("vehicle-1")).toBe(false);
  });
});

describe("availability is unaffected for ordinary statuses", () => {
  it("still blocks on a plain CONFIRMED booking with no holdExpiresAt at all", async () => {
    mocks.rows.push(row({ id: "b-confirmed", status: "CONFIRMED", holdExpiresAt: null }));

    const conflict = await findBookingConflict(prisma, { vehicleId: "vehicle-1", window });

    expect(conflict).not.toBeNull();
  });

  it("never blocks on a CANCELLED booking", async () => {
    mocks.rows.push(row({ id: "b-cancelled", status: "CANCELLED" }));

    const conflict = await findBookingConflict(prisma, { vehicleId: "vehicle-1", window });

    expect(conflict).toBeNull();
  });
});
