import {
  AuditLog,
  AuditSeverity,
  SecurityRole,
} from "@/types/security";

class AuditLogger {
  private logs: AuditLog[] = [];

  log(
    module: string,
    action: string,
    performedBy: string,
    role: SecurityRole,
    severity: AuditSeverity,
    ipAddress: string,
    entityId?: string,
    userAgent?: string
  ) {
    const entry: AuditLog = {
      id: crypto.randomUUID(),
      module,
      action,
      performedBy,
      role,
      entityId,
      ipAddress,
      userAgent,
      severity,
      createdAt: new Date(),
    };

    this.logs.unshift(entry);

    console.info("[AUDIT]", entry);

    return entry;
  }

  getAll() {
    return this.logs;
  }

  getByModule(module: string) {
    return this.logs.filter(
      (log) => log.module === module
    );
  }

  clear() {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogger();