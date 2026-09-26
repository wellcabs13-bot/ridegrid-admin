import { logger } from "@/lib/monitoring/logger";

export type MonitoringAlertSeverity = "WARNING" | "CRITICAL";

export interface MonitoringAlert {
  title: string;
  message: string;
  severity: MonitoringAlertSeverity;
  metadata?: Record<string, unknown>;
}

export async function sendMonitoringAlert(
  alert: MonitoringAlert
): Promise<boolean> {
  const webhookUrl = process.env.MONITORING_ALERT_WEBHOOK_URL;

  logger.warn("Monitoring alert triggered", {
    title: alert.title,
    severity: alert.severity,
    ...(alert.metadata ? { metadata: alert.metadata } : {}),
  });

  if (!webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service: "ridegrid-admin",
        timestamp: new Date().toISOString(),
        ...alert,
      }),
    });

    if (!response.ok) {
      logger.error("Monitoring alert delivery failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Monitoring alert delivery threw an error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}