import { prisma } from "@/lib/prisma";
import {
  RideGridEvent,
  eventBus,
} from "@/lib/events/event-bus";

function jsonValue(value: unknown) {
  return value as any;
}

async function createEventNotification(
  event: RideGridEvent
) {
  if (!event.userId) {
    return null;
  }

  return prisma.notification.create({
    data: {
      userId: event.userId,
      notificationType: "PUSH",
      title: `RideGrid ${event.module} event`,
      message: `Event ${String(event.type)} was processed successfully.`,
      status: "SENT",
      sentAt: new Date(),
    },
  });
}

async function createEventAudit(
  event: RideGridEvent,
  status: string
) {
  return prisma.auditLog.create({
    data: {
      userId: event.userId,
      action: "CREATE",
      entityName: "RideGridEvent",
      entityId: event.id,
      newValue: jsonValue({
        eventType: String(event.type),
        module: event.module,
        status,
        bookingId: event.bookingId,
        vendorId: event.vendorId,
        driverId: event.driverId,
        customerId: event.customerId,
      }),
    },
  });
}

export async function dispatchRideGridEvent(
  event: RideGridEvent
) {
  const storedEvent =
    await prisma.rideGridEvent.create({
      data: {
        id: event.id,
        eventType: String(event.type),
        module: event.module,
        status: "PENDING",
        userId: event.userId,
        bookingId: event.bookingId,
        vendorId: event.vendorId,
        driverId: event.driverId,
        customerId: event.customerId,
        payload: (event.metadata ?? {}) as any,
      },
    });

  try {
    await prisma.rideGridEvent.update({
      where: { id: storedEvent.id },
      data: {
        status: "PROCESSING",
      },
    });

    // 1. EVENT BUS
    await eventBus.publish(event);

    // 2. AUTOMATION
    await eventBus.publishAutomation(event);

    // 3. NOTIFICATION
    await createEventNotification(event);

    // 4. AUDIT
    await createEventAudit(
      event,
      "COMPLETED"
    );

    // 5. COMPLETE EVENT
    const completed =
      await prisma.rideGridEvent.update({
        where: { id: storedEvent.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });

    return completed;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Event processing failed.";

    await prisma.rideGridEvent.update({
      where: { id: storedEvent.id },
      data: {
        status: "FAILED",
        errorMessage: message,
      },
    });

    await prisma.eventRetryQueue.create({
      data: {
        eventId: storedEvent.id,
        status: "PENDING",
        nextAttemptAt: new Date(
          Date.now() + 60 * 1000
        ),
        errorMessage: message,
      },
    });

    // Failure is also audited.
    try {
      await createEventAudit(
        event,
        "FAILED"
      );
    } catch {
      // Audit failure must never hide the
      // original event-processing failure.
    }

    throw error;
  }
}

export async function processRetryQueue() {
  const jobs =
    await prisma.eventRetryQueue.findMany({
      where: {
        status: "PENDING",
        OR: [
          { nextAttemptAt: null },
          {
            nextAttemptAt: {
              lte: new Date(),
            },
          },
        ],
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 20,
    });

  let completed = 0;
  let failed = 0;

  for (const job of jobs) {
    const event =
      await prisma.rideGridEvent.findUnique({
        where: {
          id: job.eventId,
        },
      });

    if (!event) {
      await prisma.eventRetryQueue.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: "Event not found.",
        },
      });

      failed++;
      continue;
    }

    await prisma.eventRetryQueue.update({
      where: { id: job.id },
      data: {
        status: "PROCESSING",
        lastAttemptAt: new Date(),
      },
    });

    try {
      const retryEvent: RideGridEvent = {
        id: event.id,
        type:
          event.eventType as RideGridEvent["type"],
        module: event.module,
        occurredAt: event.createdAt,
        userId:
          event.userId ?? undefined,
        bookingId:
          event.bookingId ?? undefined,
        vendorId:
          event.vendorId ?? undefined,
        driverId:
          event.driverId ?? undefined,
        customerId:
          event.customerId ?? undefined,
        metadata:
          event.payload &&
          typeof event.payload === "object"
            ? (event.payload as Record<string, unknown>)
            : {},      createdAt: new Date(),
      attempts: 0,
      };

      // EVENT BUS
      await eventBus.publish(retryEvent);

      // AUTOMATION
      await eventBus.publishAutomation(
        retryEvent
      );

      // NOTIFICATION
      await createEventNotification(
        retryEvent
      );

      // AUDIT
      await createEventAudit(
        retryEvent,
        "COMPLETED"
      );

      await prisma.rideGridEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          errorMessage: null,
        },
      });

      await prisma.eventRetryQueue.update({
        where: {
          id: job.id,
        },
        data: {
          status: "COMPLETED",
          errorMessage: null,
        },
      });

      completed++;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Retry processing failed.";

      const remainingAttempts =
        Math.max(job.maxAttempts - 1, 0);

      await prisma.eventRetryQueue.update({
        where: {
          id: job.id,
        },
        data: {
          status:
            remainingAttempts <= 0
              ? "FAILED"
              : "PENDING",
          maxAttempts:
            remainingAttempts,
          nextAttemptAt:
            remainingAttempts <= 0
              ? null
              : new Date(
                  Date.now() + 60 * 1000
                ),
          errorMessage: message,
        },
      });

      await prisma.rideGridEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status:
            remainingAttempts <= 0
              ? "FAILED"
              : "PENDING",
          errorMessage: message,
        },
      });

      failed++;
    }
  }

  return {
    processed: jobs.length,
    completed,
    failed,
  };
}
