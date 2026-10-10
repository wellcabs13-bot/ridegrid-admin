import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeError } from "../src/services/errors";

test("a refused sign-in is not reported as an expired session", () => {
  assert.equal(normalizeError(401, { message: "Invalid email or password." }, false).message, "Invalid email or password.");
  assert.match(normalizeError(401).message, /session expired/);
});

test("trip conflicts show the server's reason", () => {
  assert.equal(
    normalizeError(409, { message: "This action is not available in the current trip state. Refresh and retry." }).message,
    "This action is not available in the current trip state. Refresh and retry.",
  );
  assert.equal(normalizeError(429, { message: "Wait before sending another location." }).message, "Wait before sending another location.");
  assert.match(normalizeError(403).message, /not permitted/);
});
