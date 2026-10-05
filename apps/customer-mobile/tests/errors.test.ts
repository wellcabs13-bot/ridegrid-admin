import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeError } from "../src/services/errors";
import { bookingStatusLabel, bookingTone, journeyLabel, label } from "../src/utils/journey";

test("a refused sign-in is not reported as an expired session", () => {
  assert.equal(normalizeError(401, { message: "Invalid email or password." }, false).message, "Invalid email or password.");
  assert.match(normalizeError(401).message, /session expired/);
});

test("business conflicts and refusals show the server's reason", () => {
  assert.equal(normalizeError(400, { message: "Retail bookings are paid online with PayU." }).message, "Retail bookings are paid online with PayU.");
  assert.equal(normalizeError(409, { message: "This vehicle was just booked for these dates." }).message, "This vehicle was just booked for these dates.");
  assert.match(normalizeError(409).message, /no longer available/);
  assert.match(normalizeError(409, { code: "PRICE_UNAVAILABLE", message: "PRICE_UNAVAILABLE" }).message, /no longer available at a current price/);
});

test("statuses read clearly and never rely on colour alone", () => {
  assert.equal(bookingStatusLabel("AWAITING_PAYMENT"), "Awaiting payment");
  assert.equal(bookingTone("AWAITING_PAYMENT").tone, "gold");
  assert.equal(bookingTone("CANCELLED").icon, "close-circle-outline");
  assert.equal(bookingTone("CONFIRMED").tone, "green");
  assert.equal(label("UPI"), "UPI");
  assert.equal(journeyLabel("AIRPORT"), "Airport");
  assert.equal(journeyLabel("ROUNDTRIP"), "Round trip");
});
