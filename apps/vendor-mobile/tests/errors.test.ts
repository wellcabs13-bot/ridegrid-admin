import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeError } from "../src/services/errors";

test("a refused sign-in is not reported as an expired session", () => {
  assert.equal(normalizeError(401, { message: "This account is inactive or suspended. Contact RideGrid support." }, false).message, "This account is inactive or suspended. Contact RideGrid support.");
  assert.match(normalizeError(401, {}, false).message, /email and password/);
  assert.match(normalizeError(401).message, /session expired/);
});

test("403 and 409 explain the business reason the server gave", () => {
  assert.equal(normalizeError(409, { message: "An approved vendor, verified available vehicle and active driver are required." }).message, "An approved vendor, verified available vehicle and active driver are required.");
  assert.match(normalizeError(403).message, /not permitted/);
});

test("bare error codes are explained, internals never shown", () => {
  assert.match(normalizeError(409, { code: "VERSION_CONFLICT", message: "VERSION_CONFLICT" }).message, /changed/);
  assert.doesNotMatch(normalizeError(500, { message: "prisma failed" }).message, /prisma/i);
});
