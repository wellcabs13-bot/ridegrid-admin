type LogLevel = "INFO" | "WARN" | "ERROR";

function writeLog(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "ridegrid-admin",
    message,
    ...(metadata ? { metadata } : {}),
  };

  const output = JSON.stringify(entry);

  if (level === "ERROR") {
    console.error(output);
  } else if (level === "WARN") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info(message: string, metadata?: Record<string, unknown>) {
    writeLog("INFO", message, metadata);
  },

  warn(message: string, metadata?: Record<string, unknown>) {
    writeLog("WARN", message, metadata);
  },

  error(message: string, metadata?: Record<string, unknown>) {
    writeLog("ERROR", message, metadata);
  },
};