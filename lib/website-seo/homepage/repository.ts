import {
  ConfigurationScope,
  SystemSettingType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  validateWebsiteHomepageConfig,
} from "./validation";

import type {
  WebsiteHomepageConfig,
  WebsiteHomepageSetting,
} from "./types";

const HOMEPAGE_SETTING_KEY =
  "website-seo.homepage";

export class WebsiteHomepageRepository {
  async get(): Promise<WebsiteHomepageSetting> {
    const setting =
      await prisma.systemSetting.findUnique({
        where: {
          settingKey:
            HOMEPAGE_SETTING_KEY,
        },
      });

    if (!setting) {
      return {
        configured: false,
        config: null,
        updatedAt: null,
      };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(
        setting.settingValue
      );
    } catch {
      throw new Error(
        "Stored homepage configuration contains invalid JSON."
      );
    }

    const config =
      validateWebsiteHomepageConfig(
        parsed
      );

    return {
      configured: true,
      config,
      updatedAt:
        setting.updatedAt.toISOString(),
    };
  }

  async save(
    config: WebsiteHomepageConfig
  ): Promise<WebsiteHomepageSetting> {
    const validated =
      validateWebsiteHomepageConfig(
        config
      );

    const setting =
      await prisma.systemSetting.upsert({
        where: {
          settingKey:
            HOMEPAGE_SETTING_KEY,
        },

        create: {
          settingKey:
            HOMEPAGE_SETTING_KEY,

          settingValue:
            JSON.stringify(validated),

          settingType:
            SystemSettingType.JSON,

          scope:
            ConfigurationScope.GLOBAL,

          description:
            "RideGrid public website homepage composition managed by Website & SEO.",
        },

        update: {
          settingValue:
            JSON.stringify(validated),

          settingType:
            SystemSettingType.JSON,

          scope:
            ConfigurationScope.GLOBAL,

          description:
            "RideGrid public website homepage composition managed by Website & SEO.",
        },
      });

    return {
      configured: true,
      config: validated,
      updatedAt:
        setting.updatedAt.toISOString(),
    };
  }
}

export const websiteHomepageRepository =
  new WebsiteHomepageRepository();