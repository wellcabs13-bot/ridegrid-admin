import {
  randomUUID,
} from "node:crypto";

import {
  ConfigurationScope,
  SystemSettingType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  WEBSITE_PUBLIC_NAVIGATION_LOCATIONS,
  type CreateWebsitePublicNavigationItemInput,
  type UpdateWebsitePublicNavigationItemInput,
  type WebsitePublicNavigationItem,
  type WebsitePublicNavigationLocation,
  type WebsitePublicNavigationState,
} from "./types";

import {
  assertWebsitePublicNavigationHref,
  validateCreateWebsitePublicNavigationItemInput,
  validateUpdateWebsitePublicNavigationItemInput,
  validateWebsitePublicNavigationStore,
} from "./validation";

const PUBLIC_NAVIGATION_SETTING_KEY =
  "website-seo.public-navigation";

function normalizeItems(
  items: WebsitePublicNavigationItem[]
): WebsitePublicNavigationItem[] {
  const result: WebsitePublicNavigationItem[] = [];

  for (
    const location
    of WEBSITE_PUBLIC_NAVIGATION_LOCATIONS
  ) {
    const rows =
      items
        .filter(
          (item) =>
            item.location ===
            location
        )
        .sort(
          (a, b) =>
            a.order - b.order ||
            a.createdAt.localeCompare(
              b.createdAt
            )
        )
        .map(
          (item, order) => ({
            ...item,
            order,
          })
        );

    result.push(...rows);
  }

  return result;
}

export class WebsitePublicNavigationRepository {
  private async read(): Promise<WebsitePublicNavigationState> {
    const setting =
      await prisma.systemSetting.findUnique({
        where: {
          settingKey:
            PUBLIC_NAVIGATION_SETTING_KEY,
        },
      });

    if (!setting) {
      return {
        configured: false,
        items: [],
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
        "Stored public navigation contains invalid JSON."
      );
    }

    const store =
      validateWebsitePublicNavigationStore(
        parsed
      );

    return {
      configured: true,

      items:
        normalizeItems(
          store.items
        ),

      updatedAt:
        setting.updatedAt.toISOString(),
    };
  }

  private async write(
    items: WebsitePublicNavigationItem[]
  ): Promise<void> {
    const normalized =
      normalizeItems(items);

    await prisma.systemSetting.upsert({
      where: {
        settingKey:
          PUBLIC_NAVIGATION_SETTING_KEY,
      },

      create: {
        settingKey:
          PUBLIC_NAVIGATION_SETTING_KEY,

        settingValue:
          JSON.stringify({
            version: 1,
            items: normalized,
          }),

        settingType:
          SystemSettingType.JSON,

        scope:
          ConfigurationScope.GLOBAL,

        description:
          "RideGrid public website header and footer navigation.",
      },

      update: {
        settingValue:
          JSON.stringify({
            version: 1,
            items: normalized,
          }),

        settingType:
          SystemSettingType.JSON,

        scope:
          ConfigurationScope.GLOBAL,

        description:
          "RideGrid public website header and footer navigation.",
      },
    });
  }

  async list(): Promise<WebsitePublicNavigationState> {
    return this.read();
  }

  async findById(
    id: string
  ): Promise<WebsitePublicNavigationItem | null> {
    const state =
      await this.read();

    return (
      state.items.find(
        (item) =>
          item.id === id
      ) ?? null
    );
  }

  async create(
    input: CreateWebsitePublicNavigationItemInput
  ): Promise<WebsitePublicNavigationItem> {
    const validated =
      validateCreateWebsitePublicNavigationItemInput(
        input
      );

    const state =
      await this.read();

    const siblings =
      state.items.filter(
        (item) =>
          item.location ===
          validated.location
      );

    const now =
      new Date().toISOString();

    const item: WebsitePublicNavigationItem = {
      id: randomUUID(),

      label:
        validated.label,

      href:
        validated.href,

      location:
        validated.location,

      linkType:
        validated.linkType,

      enabled:
        validated.enabled ??
        true,

      openInNewTab:
        validated.openInNewTab ??
        false,

      order:
        siblings.length,

      createdAt: now,
      updatedAt: now,
    };

    await this.write([
      ...state.items,
      item,
    ]);

    return item;
  }

  async update(
    id: string,
    input: UpdateWebsitePublicNavigationItemInput
  ): Promise<WebsitePublicNavigationItem | null> {
    const validated =
      validateUpdateWebsitePublicNavigationItemInput(
        input
      );

    const state =
      await this.read();

    const existing =
      state.items.find(
        (item) =>
          item.id === id
      );

    if (!existing) {
      return null;
    }

    const nextLocation:
      WebsitePublicNavigationLocation =
        validated.location ??
        existing.location;

    const updated: WebsitePublicNavigationItem = {
      ...existing,

      ...(validated.label !== undefined
        ? {
            label:
              validated.label,
          }
        : {}),

      ...(validated.href !== undefined
        ? {
            href:
              validated.href,
          }
        : {}),

      ...(validated.location !== undefined
        ? {
            location:
              validated.location,
          }
        : {}),

      ...(validated.linkType !== undefined
        ? {
            linkType:
              validated.linkType,
          }
        : {}),

      ...(validated.enabled !== undefined
        ? {
            enabled:
              validated.enabled,
          }
        : {}),

      ...(validated.openInNewTab !== undefined
        ? {
            openInNewTab:
              validated.openInNewTab,
          }
        : {}),

      updatedAt:
        new Date().toISOString(),
    };

    assertWebsitePublicNavigationHref(
      updated.href,
      updated.linkType
    );

    const remaining =
      state.items.filter(
        (item) =>
          item.id !== id
      );

    const targetItems =
      remaining
        .filter(
          (item) =>
            item.location ===
            nextLocation
        )
        .sort(
          (a, b) =>
            a.order - b.order
        );

    let targetIndex: number;

    if (validated.order !== undefined) {
      targetIndex = Math.min(
        validated.order,
        targetItems.length
      );
    } else if (
      nextLocation !==
      existing.location
    ) {
      targetIndex =
        targetItems.length;
    } else {
      targetIndex = Math.min(
        existing.order,
        targetItems.length
      );
    }

    targetItems.splice(
      targetIndex,
      0,
      {
        ...updated,
        location:
          nextLocation,
        order:
          targetIndex,
      }
    );

    const unaffected =
      remaining.filter(
        (item) =>
          item.location !==
          nextLocation
      );

    await this.write([
      ...unaffected,
      ...targetItems,
    ]);

    const finalState =
      await this.read();

    return (
      finalState.items.find(
        (item) =>
          item.id === id
      ) ?? null
    );
  }

  async remove(
    id: string
  ): Promise<WebsitePublicNavigationItem | null> {
    const state =
      await this.read();

    const existing =
      state.items.find(
        (item) =>
          item.id === id
      );

    if (!existing) {
      return null;
    }

    await this.write(
      state.items.filter(
        (item) =>
          item.id !== id
      )
    );

    return existing;
  }
}

export const websitePublicNavigationRepository =
  new WebsitePublicNavigationRepository();