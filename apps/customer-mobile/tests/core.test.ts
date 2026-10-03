import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarDays,
  pickupISO,
  quoteInput,
  bookingInput,
  bookingGroup,
  quoteExpired,
} from "../src/utils/journey";
import { normalizeError } from "../src/services/errors";
import { validSession } from "../src/utils/session";
import { liveActionAllowed, publicCacheFresh } from "../src/utils/offline";
import type { Listing, Quote, Search } from "../src/types";
const search: Search = {
  serviceType: "OUTSTATION",
  tripType: "ROUNDTRIP",
  pickupCity: "Pune",
  dropCity: "Mumbai|Nashik",
  date: "2030-09-24",
  time: "12:00",
  days: "4",
  category: "SEDAN",
  packageName: "",
};
const listing = {
  id: "vehicle-fixture",
  pricing: { pricingPackageId: "package-fixture" },
} as Listing;
const quote = {
  id: "quote-fixture",
  snapshot: {
    quoteExpiry: "2099-01-01T00:00:00Z",
    tripDateTime: pickupISO(search),
    tripMetrics: { days: "4" },
  },
} as Quote;
test("roundtrip counts inclusive calendar dates independently of device timezone", () => {
  assert.equal(calendarDays("2026-09-24", "2026-09-27"), 4);
  assert.equal(calendarDays("2028-02-28", "2028-03-01"), 3);
  assert.equal(calendarDays("2026-09-24", "2026-09-24"), 1);
});
test("rejects reversed, normalized-invalid and excessive date ranges", () => {
  for (const dates of [
    ["2026-02-30", "2026-03-02"],
    ["2026-09-27", "2026-09-24"],
    ["2026-01-01", "2027-01-01"],
  ])
    assert.throws(() => calendarDays(dates[0], dates[1]));
});
test("uses India business time on devices in any timezone", () => {
  assert.equal(pickupISO(search), "2030-09-24T06:30:00.000Z");
  assert.throws(() => pickupISO({ ...search, time: "25:00" }));
});
test("preserves exact quote, package, multi-city route and duration through booking", () => {
  assert.deepEqual(quoteInput(search, listing, "key"), {
    pricingPackageId: "package-fixture",
    at: "2030-09-24T06:30:00.000Z",
    idempotencyKey: "key",
    days: "4",
  });
  const body = bookingInput(
    search,
    listing,
    quote,
    {
      firstName: "Test",
      lastName: "Fixture",
      email: "fixture@example.invalid",
      mobile: "fixture",
    },
    "Pickup",
    "Drop",
  );
  assert.equal(body.days, "4");
  assert.equal(body.dropCity, "Mumbai|Nashik");
  assert.equal(body.quoteId, "quote-fixture");
  assert.equal(body.paymentMethod, "CASH");
  assert.equal("finalFare" in body, false);
});
test("blocks stale or mismatched quotes before submission", () => {
  assert.equal(
    quoteExpired({
      ...quote,
      snapshot: { ...quote.snapshot, quoteExpiry: "invalid" },
    }),
    true,
  );
  assert.throws(() =>
    bookingInput(
      { ...search, days: "5" },
      listing,
      quote,
      { firstName: "", lastName: "", email: "", mobile: "" },
      "",
      "",
    ),
  );
  assert.throws(() =>
    bookingInput(
      search,
      listing,
      { ...quote, snapshot: { ...quote.snapshot, quoteExpiry: "2000-01-01" } },
      { firstName: "", lastName: "", email: "", mobile: "" },
      "",
      "",
    ),
  );
});
test("maps every current backend booking status", () => {
  assert.deepEqual(
    [
      "PENDING",
      "CONFIRMED",
      "DRIVER_ASSIGNED",
      "TRIP_STARTED",
      "TRIP_COMPLETED",
      "CANCELLED",
    ].map(bookingGroup),
    ["Upcoming", "Upcoming", "Upcoming", "Active", "Completed", "Cancelled"],
  );
});
test("does not expose internal errors and distinguishes recoverable failures", () => {
  assert.match(
    normalizeError(500, { message: "Prisma SQL password failure" }).message,
    /temporarily/,
  );
  assert.match(normalizeError(401).message, /session expired/);
  assert.match(normalizeError(409).message, /no longer available/);
  assert.match(normalizeError(0).message, /connection/);
  assert.equal(
    normalizeError(400, { message: "Email is required." }).message,
    "Email is required.",
  );
});
test("restoration accepts only usable customer token envelopes", () => {
  assert.equal(validSession(null), false);
  assert.equal(
    validSession({
      accessToken: "a",
      refreshToken: "b",
      user: { id: "x", role: "CUSTOMER" },
    }),
    true,
  );
  assert.equal(
    validSession({
      accessToken: "a",
      refreshToken: "b",
      user: { id: "x", role: "SUPER_ADMIN" },
    }),
    false,
  );
  assert.equal(
    validSession({
      accessToken: "",
      refreshToken: "b",
      user: { id: "x", role: "CUSTOMER" },
    }),
    false,
  );
});
test("offline or signed-out actions cannot authorize mutations; caches expire", () => {
  assert.equal(liveActionAllowed(false, true), false);
  assert.equal(liveActionAllowed(true, false), false);
  assert.equal(liveActionAllowed(true, true), true);
  assert.equal(publicCacheFresh(1000, 2000), true);
  assert.equal(publicCacheFresh(1000, 86401001), false);
  assert.equal(publicCacheFresh(3000, 2000), false);
});
