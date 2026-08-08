import {
  prisma,
} from "@/lib/prisma";

import {
  AuditLog,
} from "@/types/security";

export interface AuditLogInput {
  userId?: string;
  action: string;
  entityName: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

class AuditLogger {
  async log(
    input: AuditLogInput
  ) {
    const action =
      input.action as never;

    const entry =
      await prisma.auditLog.create({
        data: {
          userId:
            input.userId,
          action,
          entityName:
            input.entityName,
          entityId:
            input.entityId,
          oldValue:
            input.oldValue === undefined
              ? undefined
              : JSON.parse(
                  JSON.stringify(
                    input.oldValue
                  )
                ),
          newValue:
            input.newValue === undefined
              ? undefined
              : JSON.parse(
                  JSON.stringify(
                    input.newValue
                  )
                ),
          ipAddress:
            input.ipAddress,
          userAgent:
            input.userAgent,
        },
      });

    return entry;
  }

  async getAll(
    limit = 100
  ) {
    return prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(
        Math.max(limit, 1),
        500
      ),
    });
  }

  async getByUser(
    userId: string,
    limit = 100
  ) {
    return prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(
        Math.max(limit, 1),
        500
      ),
    });
  }

  async getByModule(
    entityName: string,
    limit = 100
  ) {
    return prisma.auditLog.findMany({
      where: {
        entityName,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: Math.min(
        Math.max(limit, 1),
        500
      ),
    });
  }
}

export const auditLogger =
  new AuditLogger();