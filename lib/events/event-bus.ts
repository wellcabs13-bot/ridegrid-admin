export type RideGridEventDomain = "booking" | "finance" | "crm" | "analytics" | "system";

export type RideGridEvent<T = unknown> = {
  id: string;
  type: string;
  module: string;
  userId?: string;
  bookingId?: string;
  vendorId?: string;
  driverId?: string;
  customerId?: string;
  metadata?: T;
  payload?: T;
  occurredAt: Date;
  createdAt: Date;
  attempts: number;
};

type EventHandler = (event: RideGridEvent) => void | Promise<void>;

const handlers = new Map<string, Set<EventHandler>>();
const deadLetters: RideGridEvent[] = [];

function key(module: string, type: string) {
  return `${module}:${type}`;
}

export function createRideGridEvent<T = unknown>(input: {
  type: string;
  module: string;
  userId?: string;
  bookingId?: string;
  vendorId?: string;
  driverId?: string;
  customerId?: string;
  metadata?: T;
}): RideGridEvent<T> {
  const now = new Date();

  return {
    id: crypto.randomUUID(),
    type: input.type,
    module: input.module,
    userId: input.userId,
    bookingId: input.bookingId,
    vendorId: input.vendorId,
    driverId: input.driverId,
    customerId: input.customerId,
    metadata: input.metadata,
    payload: input.metadata,
    occurredAt: now,
    createdAt: now,
    attempts: 0,
  };
}

export function subscribe(
  module: RideGridEventDomain | string,
  type: string,
  handler: EventHandler
) {
  const k = key(module, type);

  if (!handlers.has(k)) {
    handlers.set(k, new Set());
  }

  handlers.get(k)!.add(handler);

  return () => {
    handlers.get(k)?.delete(handler);
  };
}

async function dispatch(event: RideGridEvent) {
  const set = handlers.get(key(event.module.toLowerCase() as RideGridEventDomain, event.type))
    ?? handlers.get(key(event.module, event.type));

  if (!set || set.size === 0) {
    return;
  }

  for (const handler of set) {
    let completed = false;

    for (let attempt = 1; attempt <= 3 && !completed; attempt++) {
      try {
        event.attempts = attempt;
        await handler(event);
        completed = true;
      } catch (error) {
        if (attempt === 3) {
          deadLetters.push({ ...event });
        }
      }
    }
  }
}

export async function publish<T = unknown>(
  module: RideGridEventDomain | string,
  type: string,
  payload: T
): Promise<RideGridEvent<T>>;
export async function publish(event: RideGridEvent): Promise<RideGridEvent>;
export async function publish<T = unknown>(
  moduleOrEvent: RideGridEventDomain | string | RideGridEvent,
  type?: string,
  payload?: T
) {
  const event: RideGridEvent =
    typeof moduleOrEvent === "object"
      ? moduleOrEvent
      : createRideGridEvent({
          module: moduleOrEvent,
          type: type ?? "unknown",
          metadata: payload,
        });

  await dispatch(event);

  return event;
}

export async function publishAutomation(event: RideGridEvent) {
  await dispatch(event);
  return event;
}

export function getDeadLetterEvents() {
  return [...deadLetters];
}

export function clearDeadLetterEvents() {
  deadLetters.length = 0;
}

export const eventBus = {
  publish,
  publishAutomation,
  subscribe,
  getDeadLetterEvents,
  clearDeadLetterEvents,
};

export const BookingEvents = {
  CREATED: "booking.created",
  CONFIRMED: "booking.confirmed",
  CANCELLED: "booking.cancelled",
  COMPLETED: "booking.completed",
} as const;

export const FinanceEvents = {
  PAYMENT_CREATED: "finance.payment.created",
  PAYMENT_VERIFIED: "finance.payment.verified",
  REFUND_CREATED: "finance.refund.created",
  SETTLEMENT_CREATED: "finance.settlement.created",
} as const;

export const CRMEvents = {
  LEAD_CREATED: "crm.lead.created",
  OPPORTUNITY_CREATED: "crm.opportunity.created",
  TASK_CREATED: "crm.task.created",
} as const;

export const AnalyticsEvents = {
  EVENT_RECORDED: "analytics.event.recorded",
  BOOKING_ANALYZED: "analytics.booking.analyzed",
} as const;