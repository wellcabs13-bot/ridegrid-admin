import { logger } from "@/lib/monitoring/logger";
import { sendMonitoringAlert } from "@/lib/monitoring/alerts";

export async function captureMonitoringError(
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const message =
    error instanceof Error ? error.message : String(error);

  const stack =
    error instanceof Error ? error.stack : undefined;

  logger.error("Application error captured", {
    message,
    ...(stack ? { stack } : {}),
    ...(context ? { context } : {}),
  });

  await sendMonitoringAlert({
    title: "RideGrid Application Error",
    message,
    severity: "CRITICAL",
    metadata: {
      ...(context ?? {}),
      ...(stack ? { stack } : {}),
    },
  });
}