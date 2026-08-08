import {
  NotificationStatus,
  NotificationType,
  Prisma,
} from "@prisma/client";

import {
  notificationRepository,
} from "@/lib/repositories/notification";

export class NotificationService {
  async getAll(
    where: Prisma.NotificationWhereInput = {}
  ) {
    return notificationRepository.findAll(where);
  }

  async getById(id: string) {
    return notificationRepository.findById(id);
  }

  async getByUser(userId: string) {
    return notificationRepository.findByUser(
      userId
    );
  }

  async getUnread(userId: string) {
    return notificationRepository.findUnread(
      userId
    );
  }

  async getByStatus(
    status: NotificationStatus
  ) {
    return notificationRepository.findByStatus(
      status
    );
  }

  async getByType(
    type: NotificationType
  ) {
    return notificationRepository.findByType(
      type
    );
  }

  async create(
    data: Prisma.NotificationCreateInput
  ) {
    return notificationRepository.create(data);
  }

  async update(
    id: string,
    data: Prisma.NotificationUpdateInput
  ) {
    return notificationRepository.update(
      id,
      data
    );
  }

  async markAsRead(id: string) {
    return notificationRepository.markAsRead(
      id
    );
  }

  async markAsSent(id: string) {
    return notificationRepository.markAsSent(
      id
    );
  }

  async send(data: {
    userId: string;
    notificationType: NotificationType;
    title: string;
    message: string;
  }) {
    return notificationRepository.create({
      user: {
        connect: {
          id: data.userId,
        },
      },
      notificationType:
        data.notificationType,
      title: data.title,
      message: data.message,
      status: NotificationStatus.PENDING,
    });
  }
}

export const notificationService =
  new NotificationService();