interface AuditLogData {
  action: string;
  userId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function auditLog(data: AuditLogData) {
  try {
    // Future:
    // Save into AuditLog table using Prisma.
    // Send to monitoring service if required.

    console.log("[AUDIT]", {
      timestamp: new Date().toISOString(),
      action: data.action,
      userId: data.userId ?? null,
      description: data.description,
      metadata: data.metadata ?? {},
    });
  } catch (error) {
    console.error("Audit Log Error:", error);
  }
}