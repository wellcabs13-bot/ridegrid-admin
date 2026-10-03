import { test } from "node:test";
import assert from "node:assert/strict";
import { validSession } from "../src/utils/session";
import { normalizeError } from "../src/services/errors";
import { assertOnline, safeRows } from "../src/utils/offline";
test("session restoration accepts only complete vendor sessions", () => {
  const s = { user: { id: "vendor-user", role: "VENDOR" }, accessToken: "access", refreshToken: "refresh" };
  assert.equal(validSession(s), true);
  for (const role of ["CUSTOMER", "DRIVER", "SUPER_ADMIN"]) assert.equal(validSession({ ...s, user: { ...s.user, role } }), false);
  assert.equal(validSession({ ...s, refreshToken: "" }), false); assert.equal(validSession(null), false);
});
test("offline mutations fail before a server action", () => { assert.throws(() => assertOnline(false), /offline/); assert.doesNotThrow(() => assertOnline(true)); });
test("persisted booking snapshots omit sensitive fields", () => { assert.deepEqual(safeRows("bookings", [{ id: "b", bookingNumber: "RG-1", status: "CONFIRMED", customer: { firstName: "Private" }, pickupLocation: "Private address", vendorEarning: "999", accessToken: "secret" }]), [{ id: "b", bookingNumber: "RG-1", status: "CONFIRMED" }]); assert.deepEqual(safeRows("drivers", [{ id: "d", firstName: "Private", licenseNumber: "private", user: { mobile: "private" }, status: "ACTIVE" }]), [{ id: "d", status: "ACTIVE" }]); });
test("safe normalized API failures", () => { for (const status of [0, 401, 403, 409, 500]) assert.ok(normalizeError(status).message.length); assert.doesNotMatch(normalizeError(400, { message: "Prisma SQL exception secret" }).message, /secret|SQL|Prisma/); assert.equal(normalizeError(400, { message: "Choose a vehicle." }).message, "Choose a vehicle."); });
