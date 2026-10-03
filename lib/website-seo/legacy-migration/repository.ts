import { randomUUID } from "node:crypto";
import {
  ConfigurationScope,
  SystemSettingType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { VERIFIED_LEGACY_SEED } from "./seed";
import type {
  LegacyMigrationEntry,
  LegacyMigrationState,
  LegacyMigrationStatus,
  LegacyRuntimeAction,
} from "./types";
import {
  normalizeLegacyPath,
  resolveLegacyActionFromEntries,
  validateLegacyEntries,
} from "./validation";

const SETTING_KEY = "website-seo.legacy-migration";

const EMPTY_STATE: LegacyMigrationState = {
  version: 1,
  entries: [],
};

function parseState(value: string | null | undefined): LegacyMigrationState {
  if (!value) return structuredClone(EMPTY_STATE);

  try {
    const parsed = JSON.parse(value);

    if (
      parsed?.version === 1 &&
      Array.isArray(parsed.entries)
    ) {
      return {
        version: 1,
        entries: parsed.entries,
      };
    }
  } catch {
    // Fail closed to empty state.
  }

  return structuredClone(EMPTY_STATE);
}

function now() {
  return new Date().toISOString();
}

export class LegacyMigrationRepository {
  async getState(): Promise<LegacyMigrationState> {
    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey: SETTING_KEY },
      select: { settingValue: true },
    });

    return parseState(setting?.settingValue);
  }

  private async saveState(
    state: LegacyMigrationState,
  ): Promise<LegacyMigrationState> {
    if (state.entries.length > 500) {
      throw new Error(
        "Legacy migration inventory is limited to 500 entries.",
      );
    }

    const errors = validateLegacyEntries(state.entries);

    if (errors.length) {
      throw new Error(errors[0]);
    }

    await prisma.systemSetting.upsert({
      where: { settingKey: SETTING_KEY },
      create: {
        settingKey: SETTING_KEY,
        settingValue: JSON.stringify(state),
        settingType: SystemSettingType.JSON,
        scope: ConfigurationScope.GLOBAL,
        description:
          "Wellcabs legacy URL migration and redirect registry.",
      },
      update: {
        settingValue: JSON.stringify(state),
        settingType: SystemSettingType.JSON,
        scope: ConfigurationScope.GLOBAL,
        description:
          "Wellcabs legacy URL migration and redirect registry.",
      },
    });

    return state;
  }

  async create(
    input: Omit<
      LegacyMigrationEntry,
      "id" | "createdAt" | "updatedAt"
    >,
  ) {
    const state = await this.getState();

    const sourcePath = normalizeLegacyPath(input.sourcePath);

    if (!sourcePath) {
      throw new Error("Invalid source path.");
    }

    const targetPath = input.targetPath
      ? normalizeLegacyPath(input.targetPath)
      : null;

    const timestamp = now();

    state.entries.push({
      ...input,
      id: randomUUID(),
      sourcePath,
      targetPath,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return this.saveState(state);
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        LegacyMigrationEntry,
        | "label"
        | "sourcePath"
        | "targetPath"
        | "strategy"
        | "status"
        | "priority"
        | "category"
        | "notes"
      >
    >,
  ) {
    const state = await this.getState();

    const index = state.entries.findIndex(
      (entry) => entry.id === id,
    );

    if (index < 0) {
      throw new Error("Legacy migration entry not found.");
    }

    const current = state.entries[index];

    const next: LegacyMigrationEntry = {
      ...current,
      ...patch,
      sourcePath:
        patch.sourcePath !== undefined
          ? normalizeLegacyPath(patch.sourcePath) || ""
          : current.sourcePath,
      targetPath:
        patch.targetPath !== undefined
          ? patch.targetPath
            ? normalizeLegacyPath(patch.targetPath)
            : null
          : current.targetPath,
      updatedAt: now(),
    };

    if (next.status === "ACTIVE") {
      await this.assertActivationAllowed(next);
    }

    state.entries[index] = next;

    return this.saveState(state);
  }

  async remove(id: string) {
    const state = await this.getState();

    state.entries = state.entries.filter(
      (entry) => entry.id !== id,
    );

    return this.saveState(state);
  }

  async bootstrapVerified() {
    const state = await this.getState();
    const existing = new Set(
      state.entries.map((entry) =>
        normalizeLegacyPath(entry.sourcePath),
      ),
    );

    const timestamp = now();

    for (const seed of VERIFIED_LEGACY_SEED) {
      const sourcePath = normalizeLegacyPath(
        seed.sourcePath,
      );

      if (!sourcePath || existing.has(sourcePath)) {
        continue;
      }

      state.entries.push({
        id: randomUUID(),
        label: seed.label,
        sourcePath,
        targetPath: seed.targetPath
          ? normalizeLegacyPath(seed.targetPath)
          : null,
        strategy: seed.strategy,
        status: "PLANNED",
        priority: seed.priority,
        category: seed.category,
        notes: seed.notes,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      existing.add(sourcePath);
    }

    return this.saveState(state);
  }

  private async assertActivationAllowed(
    entry: LegacyMigrationEntry,
  ) {
    if (entry.strategy === "GUIDE") {
      throw new Error(
        "Guide entries stay planned until the public guide page is implemented.",
      );
    }

    if (entry.strategy !== "REDIRECT") {
      return;
    }

    if (!entry.targetPath) {
      throw new Error("Redirect target is required.");
    }

    if (
      entry.targetPath === "/" ||
      entry.targetPath === "/marketplace"
    ) {
      return;
    }

    const target = await prisma.websiteSeoPage.findFirst({
      where: {
        pathname: {
          in: [
            entry.targetPath,
            `${entry.targetPath}/`,
          ],
        },
        status: "PUBLISHED",
      },
      select: { id: true },
    });

    if (!target) {
      throw new Error(
        "Target page must be PUBLISHED before this redirect can be activated.",
      );
    }
  }

  async resolve(
    pathname: string,
  ): Promise<LegacyRuntimeAction | null> {
    try {
      const state = await this.getState();

      return resolveLegacyActionFromEntries(
        state.entries,
        pathname,
      );
    } catch {
      return null;
    }
  }

  async counts() {
    const state = await this.getState();

    const count = (status: LegacyMigrationStatus) =>
      state.entries.filter(
        (entry) => entry.status === status,
      ).length;

    return {
      total: state.entries.length,
      planned: count("PLANNED"),
      ready: count("READY"),
      active: count("ACTIVE"),
      archived: count("ARCHIVED"),
      highPriority: state.entries.filter(
        (entry) => entry.priority === "HIGH",
      ).length,
    };
  }
}

export const legacyMigrationRepository =
  new LegacyMigrationRepository();