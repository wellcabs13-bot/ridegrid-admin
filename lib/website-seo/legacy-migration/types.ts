export type LegacyMigrationStrategy =
  | "REDIRECT"
  | "GUIDE"
  | "RETIRE";

export type LegacyMigrationStatus =
  | "PLANNED"
  | "READY"
  | "ACTIVE"
  | "ARCHIVED";

export type LegacyMigrationPriority =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

export type LegacyMigrationCategory =
  | "ROUTE"
  | "CITY"
  | "SERVICE"
  | "GUIDE"
  | "OTHER";

export interface LegacyMigrationEntry {
  id: string;
  label: string;
  sourcePath: string;
  targetPath: string | null;
  strategy: LegacyMigrationStrategy;
  status: LegacyMigrationStatus;
  priority: LegacyMigrationPriority;
  category: LegacyMigrationCategory;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LegacyMigrationState {
  version: 1;
  entries: LegacyMigrationEntry[];
}

export type LegacyRuntimeAction =
  | {
      kind: "REDIRECT";
      from: string;
      to: string;
      status: 308;
    }
  | {
      kind: "RETIRE";
      path: string;
      status: 410;
    };