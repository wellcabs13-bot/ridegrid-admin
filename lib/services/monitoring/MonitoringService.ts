export type HealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY";

export function evaluateHealth(input: {
  database: boolean;
  eventBus: boolean;
  storage: boolean;
}): {
  status: HealthStatus;
  checks: typeof input;
} {
  const healthyCount = Object.values(input).filter(Boolean).length;

  const status: HealthStatus =
    healthyCount === 3
      ? "HEALTHY"
      : healthyCount > 0
        ? "DEGRADED"
        : "UNHEALTHY";

  return { status, checks: input };
}

export function createStructuredLog(input: {
  level: "INFO" | "WARN" | "ERROR";
  service: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    timestamp: new Date().toISOString(),
    level: input.level,
    service: input.service,
    message: input.message,
    metadata: input.metadata ?? {},
  };
}