import { auditLogger } from "@/lib/security/audit-log";

interface AuditLogData {
  action: string;
  userId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export async function auditLog(data: AuditLogData) {
  try {
    return await auditLogger.log({
      userId: data.userId,
      action: data.action,
      entityName: data.description,
      newValue: data.metadata,
    });
  } catch (error) {
    console.error("Audit Log Error:", error);
    return null;
  }
}
