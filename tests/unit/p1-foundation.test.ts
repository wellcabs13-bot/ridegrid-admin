import { describe, expect, it } from "vitest";
import {
  requestOTP,
  verifyOTP,
} from "../../lib/auth/otp/otp-service";
import {
  createRideGridEvent,
  eventBus,
  publish,
  subscribe,
  clearDeadLetterEvents,
  getDeadLetterEvents,
} from "../../lib/events/event-bus";

describe("RideGrid P1 Foundation", () => {
  it("supports OTP request and verification", () => {
    const identifier = `p1-${Date.now()}@test.local`;
    const result = requestOTP(identifier);

    expect(result.otp).toMatch(/^\d{6}$/);
    expect(verifyOTP(identifier, result.otp)).toBe(true);
  });

  it("supports modern Event Bus publish/subscribe", async () => {
    clearDeadLetterEvents();

    let received = false;

    const unsubscribe = subscribe(
      "booking",
      "booking.created",
      async event => {
        received = event.payload === 123;
      }
    );

    await publish("booking", "booking.created", 123);

    unsubscribe();

    expect(received).toBe(true);
    expect(getDeadLetterEvents()).toHaveLength(0);
  });

  it("preserves existing RideGrid event contract", async () => {
    const event = createRideGridEvent({
      type: "TEST_EVENT",
      module: "TEST",
      userId: "p1-test-user",
      bookingId: "p1-test-booking",
      metadata: { test: true },
    });

    expect(event.id).toBeTruthy();
    expect(event.type).toBe("TEST_EVENT");
    expect(event.module).toBe("TEST");
    expect(event.userId).toBe("p1-test-user");
    expect(event.bookingId).toBe("p1-test-booking");
    expect(event.createdAt).toBeInstanceOf(Date);

    await eventBus.publish(event);
    await eventBus.publishAutomation(event);
  });
});