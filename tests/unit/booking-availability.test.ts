import { describe, expect, it } from "vitest";
import {
  reservationWindowFromDate,
  reservationWindowFromPickup,
  tripDaysFromSnapshot,
  windowsOverlap,
} from "@/lib/services/marketplace/BookingAvailabilityService";

describe("booking availability calendar windows", () => {
  it("blocks one India calendar day", () => {
    const window = reservationWindowFromDate("2026-09-22", 1);

    expect(window.start.toISOString()).toBe(
      "2026-09-21T18:30:00.000Z"
    );

    expect(window.end.toISOString()).toBe(
      "2026-09-22T18:30:00.000Z"
    );
  });

  it("blocks 23 through 26 Sep for a four-day roundtrip", () => {
    const window = reservationWindowFromDate("2026-09-23", 4);

    expect(window.start.toISOString()).toBe(
      "2026-09-22T18:30:00.000Z"
    );

    expect(window.end.toISOString()).toBe(
      "2026-09-26T18:30:00.000Z"
    );
  });

  it("allows an adjacent booking beginning exactly at reservedUntil", () => {
    const existing = reservationWindowFromDate("2026-09-23", 4);
    const next = reservationWindowFromDate("2026-09-27", 1);

    expect(windowsOverlap(existing, next)).toBe(false);
  });

  it("detects overlapping reservation windows", () => {
    const existing = reservationWindowFromDate("2026-09-23", 4);
    const requested = reservationWindowFromDate("2026-09-25", 4);

    expect(windowsOverlap(existing, requested)).toBe(true);
  });

  it("derives India date from pickup datetime", () => {
    const window = reservationWindowFromPickup(
      new Date("2026-09-22T10:00:00+05:30"),
      1
    );

    expect(window.start.toISOString()).toBe(
      "2026-09-21T18:30:00.000Z"
    );
  });

  it("uses server quote trip days", () => {
    expect(
      tripDaysFromSnapshot({
        tripMetrics: {
          days: "4",
        },
      })
    ).toBe(4);
  });
});