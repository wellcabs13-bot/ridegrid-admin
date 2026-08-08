import { AutomationTrigger } from "@/types/automation";

export interface AutomationEvent {
  trigger: AutomationTrigger;
  module: string;
  userId?: string;
  bookingId?: string;
  vendorId?: string;
  driverId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

export function createAutomationEvent(
  event: AutomationEvent
): AutomationEvent {
  return {
    ...event,
    metadata: event.metadata ?? {},
  };
}

export function isAutomationEvent(
  value: unknown
): value is AutomationEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Record<string, unknown>;

  return (
    typeof event.trigger === "string" &&
    typeof event.module === "string"
  );
}