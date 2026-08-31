import { describe, expect, it } from "vitest";
import {
  createStorageRecord,
  validateFileType,
} from "@/lib/services/storage/FileStorageService";
import {
  evaluateHealth,
  createStructuredLog,
} from "@/lib/services/monitoring/MonitoringService";

describe("P6.2 Storage + Monitoring", () => {
  it("creates a file storage record with checksum", () => {
    const file = createStorageRecord({
      name: "test.pdf",
      mimeType: "application/pdf",
      size: 100,
      content: "ridegrid",
    });

    expect(file.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(file.storageKey).toContain("media/");
  });

  it("validates allowed file types", () => {
    expect(
      validateFileType("application/pdf", ["application/pdf"])
    ).toBe(true);
    expect(
      validateFileType("application/x-executable", ["application/pdf"])
    ).toBe(false);
  });

  it("evaluates service health", () => {
    expect(
      evaluateHealth({
        database: true,
        eventBus: true,
        storage: true,
      }).status
    ).toBe("HEALTHY");

    expect(
      evaluateHealth({
        database: true,
        eventBus: false,
        storage: true,
      }).status
    ).toBe("DEGRADED");
  });

  it("creates structured logs", () => {
    const log = createStructuredLog({
      level: "INFO",
      service: "RideGrid",
      message: "Health check",
      metadata: { test: true },
    });

    expect(log.level).toBe("INFO");
    expect(log.service).toBe("RideGrid");
    expect(log.metadata.test).toBe(true);
  });
});