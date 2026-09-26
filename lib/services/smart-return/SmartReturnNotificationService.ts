import { eventBus, createRideGridEvent } from "@/lib/events/event-bus";

export async function notifySmartReturnPendingApproval(input: {
  listingId: string;
  vendorId: string;
  tripId: string;
}) {
  const event = createRideGridEvent({
    type: "SMART_RETURN_PENDING_APPROVAL",
    module: "SMART_RETURN",
    vendorId: input.vendorId,
    metadata: {
      listingId: input.listingId,
      tripId: input.tripId,
      recipient: "VENDOR",
    },
  });

  await eventBus.publish(event);
  return event;
}

export async function notifySmartReturnPublished(input: {
  listingId: string;
  vendorId: string;
  tripId: string;
}) {
  const event = createRideGridEvent({
    type: "SMART_RETURN_PUBLISHED",
    module: "SMART_RETURN",
    vendorId: input.vendorId,
    metadata: {
      listingId: input.listingId,
      tripId: input.tripId,
      recipient: "CUSTOMER_MARKETPLACE",
    },
  });

  await eventBus.publish(event);
  return event;
}