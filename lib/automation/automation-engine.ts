import {
  AutomationExecutionRequest,
  AutomationExecutionResponse,
} from "./automation-types";

import {
  AutomationAction,
} from "@/types/automation";

import {
  automationRules,
} from "./automation-rules";

import { prisma } from "@/lib/prisma";

import {
  NotificationStatus,
  NotificationType,
} from "@prisma/client";

export class AutomationEngine {
  async execute(
    request: AutomationExecutionRequest
  ): Promise<AutomationExecutionResponse> {
    const matchedRules =
      automationRules.filter(
        (rule) =>
          rule.enabled &&
          rule.trigger === request.trigger
      );

    const actions: AutomationAction[] = [];
    let executedRules = 0;
    const failures: string[] = [];

    for (const rule of matchedRules) {
      try {
        await this.executeAction(
          rule.action,
          request
        );

        actions.push(rule.action);
        executedRules += 1;

        console.info(
          `[Automation] Executed ${rule.name}`
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown automation error.";

        failures.push(
          `${rule.id}: ${message}`
        );

        console.error(
          `[Automation] Failed ${rule.name}`,
          error
        );
      }
    }

    return {
      success:
        failures.length === 0,

      executedRules,

      actions,

      message:
        failures.length === 0
          ? "Automation completed successfully."
          : `Automation completed with ${failures.length} failure(s).`,
    };
  }

  private async executeAction(
    action: AutomationAction,
    request: AutomationExecutionRequest
  ): Promise<void> {
    switch (action) {
      case AutomationAction.SEND_EMAIL:
        await this.createNotification(
          request,
          NotificationType.EMAIL
        );
        break;

      case AutomationAction.SEND_SMS:
        await this.createNotification(
          request,
          NotificationType.SMS
        );
        break;

      case AutomationAction.SEND_WHATSAPP:
        await this.createNotification(
          request,
          NotificationType.WHATSAPP
        );
        break;

      case AutomationAction.SEND_PUSH:
        await this.createNotification(
          request,
          NotificationType.PUSH
        );
        break;

      case AutomationAction.CREATE_NOTIFICATION:
        await this.createNotification(
          request,
          NotificationType.PUSH
        );
        break;

      case AutomationAction.ASSIGN_DRIVER:
        await this.assignDriver(
          request
        );
        break;

      case AutomationAction.UPDATE_BOOKING:
        await this.updateBooking(
          request
        );
        break;

      case AutomationAction.GENERATE_REPORT:
        await this.createSchedulerJob(
          request,
          "REPORT"
        );
        break;

      case AutomationAction.RUN_AI:
        await this.createSchedulerJob(
          request,
          "AI"
        );
        break;

      default:
        throw new Error(
          `Unsupported automation action: ${action}`
        );
    }
  }

  private async createNotification(
    request: AutomationExecutionRequest,
    notificationType: NotificationType
  ): Promise<void> {
    const userId =
      request.context.userId;

    if (!userId) {
      throw new Error(
        "userId is required for notification automation."
      );
    }

    const metadata =
      request.context.metadata ?? {};

    const title =
      typeof metadata.notificationTitle ===
      "string"
        ? metadata.notificationTitle
        : "RideGrid Notification";

    const message =
      typeof metadata.notificationMessage ===
      "string"
        ? metadata.notificationMessage
        : this.getDefaultMessage(
            request.trigger
          );

    await prisma.notification.create({
      data: {
        userId,
        notificationType,
        title,
        message,
        status:
          NotificationStatus.PENDING,
      },
    });
  }

  private async assignDriver(
    request: AutomationExecutionRequest
  ): Promise<void> {
    const bookingId =
      request.context.bookingId;

    if (!bookingId) {
      throw new Error(
        "bookingId is required for driver assignment."
      );
    }

    const metadata =
      request.context.metadata ?? {};

    const driverId =
      request.context.driverId ??
      (
        typeof metadata.driverId ===
        "string"
          ? metadata.driverId
          : undefined
      );

    if (!driverId) {
      throw new Error(
        "driverId is required for driver assignment."
      );
    }

    const driver =
      await prisma.driver.findUnique({
        where: {
          id: driverId,
        },
      });

    if (!driver) {
      throw new Error(
        "Driver not found."
      );
    }

    const booking =
      await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
      });

    if (!booking) {
      throw new Error(
        "Booking not found."
      );
    }

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        driverId,
      },
    });
  }

  private async updateBooking(
    request: AutomationExecutionRequest
  ): Promise<void> {
    const bookingId =
      request.context.bookingId;

    if (!bookingId) {
      throw new Error(
        "bookingId is required for booking update."
      );
    }

    const metadata =
      request.context.metadata ?? {};

    const status =
      metadata.status;

    if (
      typeof status !==
      "string"
    ) {
      throw new Error(
        "metadata.status is required for booking update."
      );
    }

    await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: status as never,
      },
    });
  }

  private async createSchedulerJob(
    request: AutomationExecutionRequest,
    type: "REPORT" | "AI"
  ): Promise<void> {
    await prisma.schedulerJob.create({
      data: {
        jobName:
          `AUTOMATION_${type}_${request.trigger}`,

        lastRun: new Date(),

        nextRun: null,

        success: true,

        remarks:
          `RideGrid ${type} automation executed for ${request.context.module}.`,
      },
    });
  }

  private getDefaultMessage(
    trigger: string
  ): string {
    switch (trigger) {
      case "BOOKING_CREATED":
        return "Your RideGrid booking has been created successfully.";

      case "BOOKING_UPDATED":
        return "Your RideGrid booking has been updated.";

      case "BOOKING_CANCELLED":
        return "Your RideGrid booking has been cancelled.";

      case "DRIVER_ASSIGNED":
        return "A driver has been assigned to your booking.";

      case "PAYMENT_RECEIVED":
        return "Your RideGrid payment has been received.";

      case "DOCUMENT_EXPIRY":
        return "A RideGrid document is approaching expiry.";

      default:
        return `RideGrid automation event: ${trigger}.`;
    }
  }
}

export const automationEngine =
  new AutomationEngine();