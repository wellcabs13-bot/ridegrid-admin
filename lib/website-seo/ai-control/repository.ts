import { prisma } from "@/lib/prisma";

import {
  DEFAULT_AI_CONTROL_STATE,
} from "./validation";

import type {
  WebsiteSeoAiControlState,
} from "./types";

const KEY =
  "website-seo.ai-control";

function safeState(
  value: string
): WebsiteSeoAiControlState {
  try {
    const parsed =
      JSON.parse(value) as Partial<WebsiteSeoAiControlState>;

    if (parsed.version !== 1) {
      return structuredClone(
        DEFAULT_AI_CONTROL_STATE
      );
    }

    return {
      ...structuredClone(
        DEFAULT_AI_CONTROL_STATE
      ),
      ...parsed,
      strategy: {
        ...DEFAULT_AI_CONTROL_STATE.strategy,
        ...(parsed.strategy ?? {}),
      },
      generationRules: {
        ...DEFAULT_AI_CONTROL_STATE.generationRules,
        ...(parsed.generationRules ?? {}),
      },

      /*
       * Critical quality guardrails are
       * intentionally not weakened by
       * persisted configuration.
       */
      guardrails: structuredClone(
        DEFAULT_AI_CONTROL_STATE.guardrails
      ),
    };
  } catch {
    return structuredClone(
      DEFAULT_AI_CONTROL_STATE
    );
  }
}

export const websiteSeoAiControlRepository = {
  async load() {
    const row =
      await prisma.systemSetting.findUnique({
        where: {
          settingKey: KEY,
        },
      });

    return row
      ? safeState(row.settingValue)
      : structuredClone(
          DEFAULT_AI_CONTROL_STATE
        );
  },

  async save(
    state: WebsiteSeoAiControlState
  ) {
    const safe: WebsiteSeoAiControlState = {
      ...state,

      /*
       * Always preserve mandatory W5/W6/W7
       * quality and publication protections.
       */
      guardrails: structuredClone(
        DEFAULT_AI_CONTROL_STATE.guardrails
      ),

      updatedAt:
        new Date().toISOString(),
    };

    await prisma.systemSetting.upsert({
      where: {
        settingKey: KEY,
      },
      create: {
        settingKey: KEY,
        settingValue:
          JSON.stringify(safe),
        settingType: "JSON",
        scope: "GLOBAL",
        description:
          "RideGrid Website SEO AI strategy, generation rules and approval controls. Secrets are never stored here.",
      },
      update: {
        settingValue:
          JSON.stringify(safe),
        settingType: "JSON",
        scope: "GLOBAL",
      },
    });

    return safe;
  },
};