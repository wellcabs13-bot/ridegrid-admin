import { test } from "node:test";
import assert from "node:assert/strict";
import { bookingStatus, documentAlert, statusLabel, statusTone } from "../src/utils/status";

test("status codes become plain words with consistent colours", () => {
  assert.equal(statusLabel("TRIP_STARTED"), "Ongoing");
  assert.equal(statusLabel("TEMPO_TRAVELLER"), "Tempo traveller");
  assert.equal(statusTone("TRIP_COMPLETED"), "blue");
  assert.equal(statusTone("CONFIRMED"), "green");
  assert.equal(statusTone("VERIFIED"), "green");
  assert.equal(statusTone("PENDING"), "amber");
  assert.equal(statusTone("CANCELLED"), "red");
  assert.equal(statusTone("REJECTED"), "red");
  assert.equal(statusTone("UNAVAILABLE"), "grey");
  assert.equal(statusTone("INACTIVE"), "grey");
});
test("bookings show the live trip state until closed", () => {
  assert.equal(bookingStatus({ status: "DRIVER_ASSIGNED", trip: { status: "ARRIVED_AT_PICKUP" } }), "ARRIVED_AT_PICKUP");
  assert.equal(bookingStatus({ status: "CANCELLED", trip: { status: "STARTED" } }), "CANCELLED");
  assert.equal(bookingStatus({ status: "CONFIRMED", trip: null }), "CONFIRMED");
});
test("document alerts come only from recorded expiry dates", () => {
  const now = Date.parse("2026-10-04T00:00:00Z");
  assert.equal(documentAlert({ expiryDate: "2026-10-01T00:00:00Z" }, now), "EXPIRED");
  assert.equal(documentAlert({ expiryDate: "2026-10-20T00:00:00Z" }, now), "EXPIRING_SOON");
  assert.equal(documentAlert({ expiryDate: "2027-10-20T00:00:00Z" }, now), null);
  assert.equal(documentAlert({ expiryDate: null }, now), null);
});
