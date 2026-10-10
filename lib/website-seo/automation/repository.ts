import { prisma } from "@/lib/prisma";
import type {
  WebsiteAutomationActivity,
  WebsiteAutomationSchedule,
  WebsiteAutomationState,
} from "./types";

const SETTING_KEY = "website-seo.automation";

const DEFAULT_STATE: WebsiteAutomationState = {
  version: 1,
  approvalMode: "ASSISTED",
  workflows: [],
  rules: [],
  schedules: [],
  activity: [],
  failures: [],
};

function parseState(value: string): WebsiteAutomationState {
  try {
    const parsed = JSON.parse(value) as Partial<WebsiteAutomationState>;

    if (
      parsed.version !== 1 ||
      !["MANUAL", "ASSISTED", "AUTOMATIC"].includes(
        String(parsed.approvalMode)
      )
    ) {
      return structuredClone(DEFAULT_STATE);
    }

    return {
      version: 1,
      approvalMode: parsed.approvalMode!,
      workflows: Array.isArray(parsed.workflows) ? parsed.workflows : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      failures: Array.isArray(parsed.failures) ? parsed.failures : [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export const websiteAutomationRepository = {
  async load(): Promise<WebsiteAutomationState> {
    const stored = await prisma.systemSetting.findUnique({
      where: { settingKey: SETTING_KEY },
    });

    return stored
      ? parseState(stored.settingValue)
      : structuredClone(DEFAULT_STATE);
  },

  async save(
    state: WebsiteAutomationState
  ): Promise<WebsiteAutomationState> {
    const value = JSON.stringify(state);

    await prisma.systemSetting.upsert({
      where: { settingKey: SETTING_KEY },
      create: {
        settingKey: SETTING_KEY,
        settingValue: value,
        settingType: "JSON",
        scope: "GLOBAL",
        description:
          "RideGrid Website SEO automation workflows, rules, schedules and bounded execution history.",
      },
      update: {
        settingValue: value,
        settingType: "JSON",
        scope: "GLOBAL",
      },
    });

    return state;
  },

  async recordActivity(
    activity: WebsiteAutomationActivity
  ) {
    const state = await this.load();

    state.activity = [
      activity,
      ...state.activity,
    ].slice(0, 100);

    if (
      activity.status === "FAILED" ||
      activity.status === "BLOCKED"
    ) {
      state.failures = [
        activity,
        ...state.failures,
      ].slice(0, 100);
    }

    await this.save(state);
  },

  async updateScheduleRun(
    id: string,
    patch: Pick<
      WebsiteAutomationSchedule,
      "lastRunAt" | "lastOutcome" | "nextRunAt"
    >
  ) {
    const state = await this.load();

    state.schedules = state.schedules.map((schedule) =>
      schedule.id === id
        ? {
            ...schedule,
            ...patch,
            updatedAt: new Date().toISOString(),
          }
        : schedule
    );

    await this.save(state);
  },
};