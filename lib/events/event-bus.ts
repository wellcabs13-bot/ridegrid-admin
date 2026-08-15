import {
  AutomationExecutionRequest,
  AutomationExecutionResponse,
} from "@/lib/automation/automation-types";

import { AutomationTrigger } from "@/types/automation";
import { automationEngine } from "@/lib/automation/automation-engine";

export interface RideGridEvent {
  id: string;
  type: AutomationTrigger;
  module: string;
  occurredAt: Date;
  userId?: string;
  bookingId?: string;
  vendorId?: string;
  driverId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

type EventHandler = (event: RideGridEvent) => Promise<void>;

class EventBus {
  private handlers =
    new Map<AutomationTrigger, EventHandler[]>();

  subscribe(
    eventType: AutomationTrigger,
    handler: EventHandler
  ): () => void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler);
    this.handlers.set(eventType, existing);

    return () => {
      const current = this.handlers.get(eventType) ?? [];
      this.handlers.set(
        eventType,
        current.filter((item) => item !== handler)
      );
    };
  }

  async publish(event: RideGridEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];

    for (const handler of handlers) {
      await handler(event);
    }
  }

  async publishAutomation(
    event: RideGridEvent
  ): Promise<AutomationExecutionResponse> {
    const request: AutomationExecutionRequest = {
      trigger: event.type,
      context: {
        module: event.module,
        userId: event.userId,
        bookingId: event.bookingId,
        vendorId: event.vendorId,
        driverId: event.driverId,
        customerId: event.customerId,
        metadata: event.metadata ?? {},
      },
    };

    return automationEngine.execute(request);
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();

export function createRideGridEvent(
  input: Omit<RideGridEvent, "id" | "occurredAt">
): RideGridEvent {
  return {
    ...input,
    id: crypto.randomUUID(),
    occurredAt: new Date(),
    metadata: input.metadata ?? {},
  };
}

