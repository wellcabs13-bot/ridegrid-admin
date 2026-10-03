import { test } from "node:test";
import assert from "node:assert/strict";
import { validSession } from "../src/utils/session";
import { assertOnline, safeRows } from "../src/utils/offline";
import { uncertain, normalizeError } from "../src/services/errors";
import { approvedRideInput, pickupISO, quoteInput, rideInput, tripGroup } from "../src/utils/journey";
import type { Approval, Listing, Quote, Search } from "../src/types";

const future = new Date(Date.now() + 3 * 86400000);
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(future);
const search: Search = { serviceType: "OUTSTATION", tripType: "ONEWAY", pickupCity: "Pune", dropCity: "Mumbai", date, time: "09:30", days: "1", category: "SEDAN", packageName: "" };
const listing = { id: "car-a", pricing: { pricingPackageId: "pkg-a" } } as Listing;
const fare = { vendorFare: "3500", platformFee: "100", taxAmount: "400", passThroughTotal: "0", discount: "0", finalPayable: "4000", taxComponents: [], passThroughCharges: [], quoteExpiry: new Date(Date.now() + 600000).toISOString(), tripDateTime: pickupISO(search), days: "1" };
const quote: Quote = { id: "quote-a", expiresAt: fare.quoteExpiry, vehicleId: "car-a", fare, policy: { decision: "ALLOWED", reasons: [] } };

test("only complete corporate employee sessions are restored", () => {
  const session = { accessToken: "a", refreshToken: "r", expiresAt: "", user: { id: "u", role: "CORPORATE_EMPLOYEE" } };
  assert.equal(validSession(session), true);
  for (const role of ["CORPORATE_ADMIN", "CUSTOMER", "DRIVER", "VENDOR", "SUPER_ADMIN"]) assert.equal(validSession({ ...session, user: { id: "u", role } }), false);
  assert.equal(validSession({ ...session, accessToken: "" }), false);
  assert.equal(validSession({ ...session, user: { id: "", role: "CORPORATE_EMPLOYEE" } }), false);
  assert.equal(validSession(null), false);
});

test("offline mutations fail before any request and the cache keeps no personal data", () => {
  assert.throws(() => assertOnline(false), /offline/);
  assert.doesNotThrow(() => assertOnline(true));
  assert.deepEqual(
    safeRows([{ id: "b", bookingNumber: "RG1", status: "CONFIRMED", pickupDateTime: "t", service: "LOCAL", pickupLocation: "home", driver: { mobile: "9" }, finalFare: "4000", fare }]),
    [{ id: "b", bookingNumber: "RG1", status: "CONFIRMED", pickupDateTime: "t", service: "LOCAL" }],
  );
});

test("a lost or failed booking response is treated as uncertain, not as failure", () => {
  assert.equal(uncertain(normalizeError(0)), true);
  assert.equal(uncertain(normalizeError(503)), true);
  assert.equal(uncertain(normalizeError(409, { message: "Taken" })), false);
  assert.equal(normalizeError(403, { message: "This ride is not allowed by policy." }).message, "This ride is not allowed by policy.");
  assert.equal(normalizeError(500, { message: "prisma exploded" }).message, "The service is temporarily unavailable. Please try again.");
});

test("trip times are India time regardless of device time zone", () => {
  assert.equal(pickupISO({ date: "2026-10-01", time: "09:30" }), "2026-10-01T04:00:00.000Z");
  assert.throws(() => pickupISO({ date: "2026-02-30", time: "09:30" }));
  assert.throws(() => pickupISO({ date: "2026-10-01", time: "25:00" }));
  assert.deepEqual(quoteInput({ ...search, tripType: "ROUNDTRIP", days: "3" }, listing, "k"), { pricingPackageId: "pkg-a", at: pickupISO(search), idempotencyKey: "k", days: "3" });
});

test("booking payloads never carry company or employee identity", () => {
  const input = rideInput(search, listing, quote, " Office ", "Airport");
  assert.deepEqual(Object.keys(input).sort(), ["dropAddress", "listingId", "pickupAddress", "pickupDateTime", "pricingPackageId", "quoteId"]);
  assert.equal(input.pickupAddress, "Office");
  assert.throws(() => rideInput(search, listing, { ...quote, fare: { ...fare, quoteExpiry: new Date(Date.now() - 1).toISOString() } }, "a", "b"), /expired/);
  assert.throws(() => rideInput({ ...search, time: "10:00" }, listing, quote, "a", "b"), /changed/);
  assert.throws(() => rideInput(search, listing, quote, " ", "b"), /addresses/);
});

test("an approved ride books only for its approved time and amount", () => {
  const approval = { id: "req", status: "APPROVED", amount: "4000.00", ride: { listingId: "car-a", pricingPackageId: "pkg-a", pickupDateTime: fare.tripDateTime, pickupAddress: "Office", dropAddress: "Airport", tripType: "ONEWAY", days: "1" } } as unknown as Approval;
  assert.deepEqual(approvedRideInput(approval, quote), { quoteId: "quote-a", listingId: "car-a", pricingPackageId: "pkg-a", pickupDateTime: fare.tripDateTime, pickupAddress: "Office", dropAddress: "Airport", approvalId: "req" });
  assert.throws(() => approvedRideInput(approval, { ...quote, fare: { ...fare, finalPayable: "4000.01" } }), /higher than the approved/);
  assert.throws(() => approvedRideInput({ ...approval, status: "PENDING" } as Approval, quote), /not available/);
  assert.throws(() => approvedRideInput({ ...approval, status: "EXPIRED" } as Approval, quote), /not available/);
});

test("trips group by central booking status", () => {
  assert.equal(tripGroup("CONFIRMED"), "UPCOMING");
  assert.equal(tripGroup("DRIVER_ASSIGNED"), "UPCOMING");
  assert.equal(tripGroup("TRIP_STARTED"), "ACTIVE");
  assert.equal(tripGroup("TRIP_COMPLETED"), "COMPLETED");
  assert.equal(tripGroup("CANCELLED"), "CANCELLED");
});
