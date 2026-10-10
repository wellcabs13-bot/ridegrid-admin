import { test } from "node:test";
import assert from "node:assert/strict";
import { validSession } from "../src/utils/session";
import { assertOnline, safeRows } from "../src/utils/offline";
import { activeLocation, navigationUrl, tripStatus, shareText } from "../src/utils/trips";
import type { Booking } from "../src/types";
test("only complete driver sessions can be restored", () => {
  const session = { accessToken: "access", refreshToken: "refresh", user: { id: "a", role: "DRIVER" } };
  assert.equal(validSession(session), true);
  for (const role of ["VENDOR", "CUSTOMER", "SUPER_ADMIN"]) assert.equal(validSession({ ...session, user: { id: "a", role } }), false);
  assert.equal(validSession({ ...session, refreshToken: "" }), false); assert.equal(validSession(null), false);
});
test("offline mutations fail before the request and cache excludes personal data", () => {
  assert.throws(() => assertOnline(false)); assert.doesNotThrow(() => assertOnline(true));
  assert.deepEqual(safeRows("trips-ACTIVE-1", [{ id: "a", bookingNumber: "RG1", status: "TRIP_STARTED", customerPhone: "secret", customer: { name: "secret" }, latitude: 12, licenseNumber: "secret" }]), [{ id: "a", bookingNumber: "RG1", status: "TRIP_STARTED" }]);
});
test("location is eligible only during a server-confirmed operational state", () => {
  const b = { status: "DRIVER_ASSIGNED", trip: { status: "ASSIGNED" } } as Booking;
  assert.equal(activeLocation(b), false); b.trip!.status = "ARRIVED_AT_PICKUP"; assert.equal(activeLocation(b), true);
  b.status = "CANCELLED"; assert.equal(activeLocation(b), false); assert.equal(tripStatus(b), "CANCELLED");
  b.status = "TRIP_COMPLETED"; assert.equal(activeLocation(b), false);
});
test("navigation works with addresses and trip sharing omits customer contacts", () => {
  assert.match(navigationUrl("Pune & Airport"), /Pune%20%26%20Airport/);
  const b = { bookingNumber: "RG1", pickupLocation: "Pune", dropLocation: "Mumbai", pickupDateTime: "2026", status: "TRIP_STARTED", trip: null, vehicle: { registrationNumber: "MH01" }, customerPhone: "secret" } as Booking;
  assert.equal(shareText(b).includes("secret"), false);
});
