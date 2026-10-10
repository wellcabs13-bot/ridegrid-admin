import { test } from "node:test";
import assert from "node:assert/strict";
import { driverAction, duration, relative, statusInfo, tripPhase } from "../src/utils/trips";
import type { Booking } from "../src/types";
type T = Pick<Booking, "status" | "trip">;
const trip = (status: string) => ({ id: "t", status, driverAssignedAt: null, arrivedPickupAt: null, tripStartedAt: null, tripCompletedAt: null });
// What the server stores after each accepted action (backend nextDriverState).
const apply = (b: T, action: string): T =>
  action === "ARRIVED" ? { status: "DRIVER_ASSIGNED", trip: trip("ARRIVED_AT_PICKUP") }
  : action === "START" ? { status: "TRIP_STARTED", trip: trip("STARTED") }
  : { status: "TRIP_COMPLETED", trip: trip("COMPLETED") };

test("Upcoming → Arrived → Start → Complete offers exactly one valid action per screen", () => {
  let b: T = { status: "DRIVER_ASSIGNED", trip: null };
  const seen: string[] = [];
  for (const [phase, action, label] of [["upcoming", "ARRIVED", "Upcoming"], ["arrived", "START", "At pickup"], ["inProgress", "COMPLETE", "In progress"]] as const) {
    assert.equal(tripPhase(b), phase); assert.equal(driverAction(b), action); assert.equal(statusInfo(b).label, label);
    seen.push(action); b = apply(b, action);
  }
  assert.deepEqual(seen, ["ARRIVED", "START", "COMPLETE"]);
  assert.equal(tripPhase(b), "completed"); assert.equal(driverAction(b), null);
});
test("no lifecycle step can be skipped or taken from a closed trip", () => {
  assert.equal(driverAction({ status: "DRIVER_ASSIGNED", trip: trip("ASSIGNED") }), "ARRIVED");
  assert.equal(driverAction({ status: "TRIP_STARTED", trip: trip("PASSENGER_ONBOARD") }), "COMPLETE");
  for (const b of [
    { status: "CONFIRMED", trip: null }, { status: "CANCELLED", trip: trip("ARRIVED_AT_PICKUP") },
    { status: "TRIP_COMPLETED", trip: trip("COMPLETED") }, { status: "TRIP_STARTED", trip: trip("ARRIVED_AT_PICKUP") },
  ] as T[]) assert.equal(driverAction(b), null);
  assert.equal(tripPhase({ status: "CONFIRMED", trip: null }), "scheduled");
  assert.equal(tripPhase({ status: "CANCELLED", trip: trip("STARTED") }), "cancelled");
});
test("times shown are derived from real timestamps", () => {
  const now = Date.parse("2026-10-09T04:00:00Z");
  assert.equal(relative("2026-10-09T04:25:00Z", now), "in 25 min");
  assert.equal(relative("2026-10-09T02:55:00Z", now), "1 h 5 min ago");
  assert.equal(relative(null, now), "");
  assert.equal(duration("2026-10-09T04:00:00Z", "2026-10-09T04:35:00Z"), "35 min");
  assert.equal(duration("2026-10-09T04:00:00Z", null), "");
});
