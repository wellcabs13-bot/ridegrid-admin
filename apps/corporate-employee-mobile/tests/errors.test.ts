import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeError } from "../src/services/errors";

test("a refused sign-in is not reported as an expired session", () => {
  assert.equal(normalizeError(401, { message: "Invalid email or password." }, false).message, "Invalid email or password.");
  assert.match(normalizeError(401, {}, false).message, /email and password/);
  assert.match(normalizeError(401, { message: "Invalid email or password." }).message, /session expired/);
});

test("403 and 409 explain the business reason the server gave", () => {
  assert.equal(normalizeError(403, { message: "Your company has not enabled booking for your profile." }).message, "Your company has not enabled booking for your profile.");
  assert.match(normalizeError(403).message, /not permitted/);
  assert.equal(normalizeError(409, { message: "This request has already been decided." }).message, "This request has already been decided.");
});

test("bare error codes are explained, internals never shown", () => {
  assert.match(normalizeError(409, { code: "PRICE_UNAVAILABLE", message: "PRICE_UNAVAILABLE" }).message, /no longer available/);
  assert.doesNotMatch(normalizeError(409, { message: "SOME_INTERNAL_CODE" }).message, /SOME_INTERNAL_CODE/);
  assert.doesNotMatch(normalizeError(400, { message: "PrismaClientKnownRequestError: sql" }).message, /prisma|sql/i);
  assert.match(normalizeError(429).message, /Wait a moment/);
  assert.match(normalizeError(0).message, /connect/);
});
