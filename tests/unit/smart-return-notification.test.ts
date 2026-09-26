import { describe, expect, it } from "vitest";
import { eventBus, subscribe } from "../../lib/events/event-bus";
import {
  notifySmartReturnPendingApproval,
  notifySmartReturnPublished,
} from "../../lib/services/smart-return/SmartReturnNotificationService";

describe("P2.6 Smart Return Notifications", () => {
  it("publishes vendor approval notification event", async () => {
    let received = false;

    const unsubscribe = subscribe(
      "SMART_RETURN",
      "SMART_RETURN_PENDING_APPROVAL",
      async event => {
        received = event.metadata?.recipient === "VENDOR";
      }
    );

    await notifySmartReturnPendingApproval({
      listingId: "listing-1",
      vendorId: "vendor-1",
      tripId: "trip-1",
    });

    unsubscribe();
    expect(received).toBe(true);
  });

  it("publishes customer marketplace availability event", async () => {
    let received = false;

    const unsubscribe = subscribe(
      "SMART_RETURN",
      "SMART_RETURN_PUBLISHED",
      async event => {
        received = event.metadata?.recipient === "CUSTOMER_MARKETPLACE";
      }
    );

    await notifySmartReturnPublished({
      listingId: "listing-1",
      vendorId: "vendor-1",
      tripId: "trip-1",
    });

    unsubscribe();
    expect(received).toBe(true);
  });
});