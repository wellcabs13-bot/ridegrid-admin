import {
  NotificationStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class NotificationRepository {
  async findAll(
    where: Prisma.NotificationWhereInput = {}
  ) {
    return prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.notification.findUnique({
      where: { id },
    });
  }

  async findByUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findUnread(userId: string) {
    return prisma.notification.findMany({
      where: {
        userId,
        sentAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByStatus(
    status: NotificationStatus
  ) {
    return prisma.notification.findMany({
      where: { status },
      orderBy: {
        createdAt: "asc",
      },
    });
  }

  async findByType(
    notificationType: NotificationType
  ) {
    return prisma.notification.findMany({
      where: {
        notificationType,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async create(
    data: Prisma.NotificationCreateInput
  ) {
    return prisma.notification.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.NotificationUpdateInput
  ) {
    return prisma.notification.update({
      where: { id },
      data,
    });
  }

  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: {
        sentAt: new Date(),
      },
    });
  }

  async markAsSent(id: string) {
    return prisma.notification.update({
      where: { id },
      data: {
        sentAt: new Date(),
        status: NotificationStatus.SENT,
      },
    });
  }
}

export const notificationRepository =
  new NotificationRepository();