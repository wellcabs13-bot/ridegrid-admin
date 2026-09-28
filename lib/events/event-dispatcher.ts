import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  RideGridEvent,
  createRideGridEvent,
  eventBus,
} from "@/lib/events/event-bus";
import { automationEngine } from "@/lib/automation/automation-engine";
import type { AutomationRuleResult } from "@/lib/automation/automation-types";
import type { AutomationTrigger } from "@/types/automation";

// Central event pipeline: store → in-process subscribers → automation rules → audit.
// Per-rule automation results are stored on the event under `_automation` so the
// Automation dashboard can show executions/failures and a retry never repeats a
// rule that already succeeded.

export const AUTOMATION_KEY = "_automation";

export type StoredAutomation = {
  completed: string[];
  failed: { ruleId: string; error: string }[];
  skipped: string[];
  at: string;
};

function jsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function plainMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const { [AUTOMATION_KEY]: _ignored, ...rest } = metadata as Record<string, unknown>;
  return rest;
}

export function storedAutomation(payload: unknown): StoredAutomation | null {
  const value = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>)[AUTOMATION_KEY] : null;
  return value && typeof value === "object" ? (value as StoredAutomation) : null;
}

class AutomationFailedError extends Error {}

async function runAutomation(event: RideGridEvent, previous: StoredAutomation | null) {
  const result = await automationEngine.execute({
    trigger: String(event.type) as AutomationTrigger,
    context: {
      module: event.module,
      userId: event.userId,
      bookingId: event.bookingId,
      vendorId: event.vendorId,
      driverId: event.driverId,
      customerId: event.customerId,
      metadata: plainMetadata(event.metadata),
    },
    completedRuleIds: previous?.completed,
  });
  const byStatus = (s: AutomationRuleResult["status"]) => result.results.filter(r => r.status === s).map(r => r.ruleId);
  const stored: StoredAutomation = {
    completed: [...new Set([...(previous?.completed ?? []), ...byStatus("EXECUTED")])],
    failed: result.results.filter(r => r.status === "FAILED").map(r => ({ ruleId: r.ruleId, error: r.error ?? "Failed" })),
    skipped: byStatus("SKIPPED_DISABLED"),
    at: new Date().toISOString(),
  };
  return { result, stored };
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

// Runs subscribers and automation for an already-stored event and records the outcome.
async function processStoredEvent(event: RideGridEvent, previous: StoredAutomation | null) {
  const metadata = plainMetadata(event.metadata);
  // 1. In-process subscribers on the event bus.
  await eventBus.publish(event);
  // 2. Automation rules subscribed to this trigger.
  const { result, stored } = await runAutomation(event, previous);
  await prisma.rideGridEvent.update({
    where: { id: event.id },
    data: { payload: jsonValue({ ...metadata, [AUTOMATION_KEY]: stored }) },
  });
  if (!result.success) throw new AutomationFailedError(result.message);
  // 3. Audit.
  await createEventAudit(event, "COMPLETED");
  return stored;
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
        status: "PROCESSING",
        userId: event.userId,
        bookingId: event.bookingId,
        vendorId: event.vendorId,
        driverId: event.driverId,
        customerId: event.customerId,
        payload: jsonValue(plainMetadata(event.metadata)),
      },
    });

  try {
    await processStoredEvent(event, null);

    return await prisma.rideGridEvent.update({
      where: { id: storedEvent.id },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        errorMessage: null,
      },
    });
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

// For emitters whose own write has already committed: a dispatch failure is stored
// and queued for retry by dispatchRideGridEvent, so it must not fail the caller.
export async function emitRideGridEvent(
  input: Parameters<typeof createRideGridEvent>[0]
) {
  try {
    return await dispatchRideGridEvent(createRideGridEvent(input));
  } catch (error) {
    console.error(`[Events] ${input.type} dispatch failed:`, error instanceof Error ? error.message : error);
    return null;
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
        attemptCount: { increment: 1 },
      },
    });

    try {
      const retryEvent: RideGridEvent = {
        id: event.id,
        type: event.eventType,
        module: event.module,
        occurredAt: event.createdAt,
        userId: event.userId ?? undefined,
        bookingId: event.bookingId ?? undefined,
        vendorId: event.vendorId ?? undefined,
        driverId: event.driverId ?? undefined,
        customerId: event.customerId ?? undefined,
        metadata: plainMetadata(event.payload),
        createdAt: new Date(),
        attempts: job.attemptCount + 1,
      };

      await processStoredEvent(retryEvent, storedAutomation(event.payload));

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

      const exhausted = job.attemptCount + 1 >= job.maxAttempts;

      await prisma.eventRetryQueue.update({
        where: {
          id: job.id,
        },
        data: {
          status: exhausted ? "FAILED" : "PENDING",
          nextAttemptAt: exhausted
            ? null
            : new Date(Date.now() + 60 * 1000),
          errorMessage: message,
        },
      });

      await prisma.rideGridEvent.update({
        where: {
          id: event.id,
        },
        data: {
          status: "FAILED",
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
