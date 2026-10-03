import { test } from "node:test";
import assert from "node:assert/strict";
import { routeParams, shareSummary } from "../src/utils/routes";
import type { Booking, RouteDraft } from "../src/types";
test("rebooking starts with route only and cannot carry a historical quote or date", () => {
  const input = {
    serviceType: "OUTSTATION",
    tripType: "ROUNDTRIP",
    pickupCity: "Pune",
    dropCity: "Mumbai|Nashik",
    category: "SEDAN",
    packageName: "",
    date: "2020-01-01",
    days: "4",
    quoteId: "old",
    finalPayable: 1,
  };
  const actual = routeParams(input as RouteDraft);
  assert.equal(actual.dropCity, "Mumbai|Nashik");
  for (const key of ["date", "days", "quoteId", "finalPayable"])
    assert.equal(key in actual, false);
});
test("trip sharing omits payment data, account identifiers and driver contact", () => {
  const b = {
    pickupLocation: "Pune",
    dropLocation: "Mumbai",
    pickupDateTime: "2030-09-24T06:30:00Z",
    status: "CONFIRMED",
    vehicle: { make: "Test", model: "Car", registrationNumber: "TEST" },
    transactions: [{ amount: "secret-payment" }],
    driver: { user: { mobile: "private-number" } },
    customer: { email: "private-email" },
  } as unknown as Booking;
  const summary = shareSummary(b);
  assert.match(summary, /Pune → Mumbai/);
  for (const secret of ["secret-payment", "private-number", "private-email"])
    assert.equal(summary.includes(secret), false);
});
