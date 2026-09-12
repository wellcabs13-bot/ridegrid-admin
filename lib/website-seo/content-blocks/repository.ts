import {
  randomUUID,
} from "node:crypto";

import {
  ConfigurationScope,
  SystemSettingType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  EMPTY_WEBSITE_CONTENT_BLOCK_CONTENT,
  type CreateWebsiteContentBlockInput,
  type UpdateWebsiteContentBlockInput,
  type WebsiteContentBlock,
  type WebsiteContentBlocksState,
} from "./types";

import {
  normalizeWebsiteContentBlockKey,
  validateCreateWebsiteContentBlockInput,
  validateUpdateWebsiteContentBlockInput,
  validateWebsiteContentBlockStore,
} from "./validation";

const CONTENT_BLOCKS_SETTING_KEY =
  "website-seo.content-blocks";

function sortedBlocks(
  blocks: WebsiteContentBlock[]
): WebsiteContentBlock[] {
  return [...blocks].sort(
    (a, b) =>
      a.order - b.order ||
      a.name.localeCompare(
        b.name
      )
  );
}

export class WebsiteContentBlocksRepository {
  private async read(): Promise<WebsiteContentBlocksState> {
    const setting =
      await prisma.systemSetting.findUnique({
        where: {
          settingKey:
            CONTENT_BLOCKS_SETTING_KEY,
        },
      });

    if (!setting) {
      return {
        configured: false,
        blocks: [],
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
        "Stored content block configuration contains invalid JSON."
      );
    }

    const store =
      validateWebsiteContentBlockStore(
        parsed
      );

    return {
      configured: true,
      blocks:
        sortedBlocks(
          store.blocks
        ),
      updatedAt:
        setting.updatedAt.toISOString(),
    };
  }

  private async write(
    blocks: WebsiteContentBlock[]
  ): Promise<void> {
    const ordered =
      sortedBlocks(blocks);

    const value = JSON.stringify({
      version: 1,
      blocks: ordered,
    });

    await prisma.systemSetting.upsert({
      where: {
        settingKey:
          CONTENT_BLOCKS_SETTING_KEY,
      },

      create: {
        settingKey:
          CONTENT_BLOCKS_SETTING_KEY,

        settingValue:
          value,

        settingType:
          SystemSettingType.JSON,

        scope:
          ConfigurationScope.GLOBAL,

        description:
          "Reusable RideGrid public website content blocks managed by Website & SEO.",
      },

      update: {
        settingValue:
          value,

        settingType:
          SystemSettingType.JSON,

        scope:
          ConfigurationScope.GLOBAL,

        description:
          "Reusable RideGrid public website content blocks managed by Website & SEO.",
      },
    });
  }

  async list(): Promise<WebsiteContentBlocksState> {
    return this.read();
  }

  async findById(
    id: string
  ): Promise<WebsiteContentBlock | null> {
    const state =
      await this.read();

    return (
      state.blocks.find(
        (block) =>
          block.id === id
      ) ?? null
    );
  }

  async create(
    input: CreateWebsiteContentBlockInput
  ): Promise<WebsiteContentBlock> {
    const validated =
      validateCreateWebsiteContentBlockInput(
        input
      );

    const state =
      await this.read();

    const base =
      normalizeWebsiteContentBlockKey(
        validated.key ??
          validated.name
      );

    if (!base) {
      throw new Error(
        "Unable to create a valid content block key."
      );
    }

    const existingKeys =
      new Set(
        state.blocks.map(
          (block) =>
            block.key
        )
      );

    let key = base;
    let suffix = 2;

    while (
      existingKeys.has(key)
    ) {
      key = `${base}-${suffix}`;
      suffix += 1;
    }

    const now =
      new Date().toISOString();

    const maxOrder =
      state.blocks.reduce(
        (maximum, block) =>
          Math.max(
            maximum,
            block.order
          ),
        -1
      );

    const block: WebsiteContentBlock = {
      id: randomUUID(),
      name: validated.name,
      key,
      status:
        validated.status ??
        "DRAFT",
      category:
        validated.category,
      scope:
        validated.scope,
      placement:
        validated.placement,
      order:
        maxOrder + 1,

      content: {
        ...EMPTY_WEBSITE_CONTENT_BLOCK_CONTENT,
        ...validated.content,
      },

      createdAt: now,
      updatedAt: now,
    };

    await this.write([
      ...state.blocks,
      block,
    ]);

    return block;
  }

  async update(
    id: string,
    input: UpdateWebsiteContentBlockInput
  ): Promise<WebsiteContentBlock | null> {
    const validated =
      validateUpdateWebsiteContentBlockInput(
        input
      );

    const state =
      await this.read();

    const existing =
      state.blocks.find(
        (block) =>
          block.id === id
      );

    if (!existing) {
      return null;
    }

    if (
      validated.key &&
      state.blocks.some(
        (block) =>
          block.id !== id &&
          block.key ===
            validated.key
      )
    ) {
      throw new Error(
        "A content block with this key already exists."
      );
    }

    const updated: WebsiteContentBlock = {
      ...existing,

      ...(validated.name !==
      undefined
        ? {
            name:
              validated.name,
          }
        : {}),

      ...(validated.key !==
      undefined
        ? {
            key:
              validated.key,
          }
        : {}),

      ...(validated.status !==
      undefined
        ? {
            status:
              validated.status,
          }
        : {}),

      ...(validated.category !==
      undefined
        ? {
            category:
              validated.category,
          }
        : {}),

      ...(validated.scope !==
      undefined
        ? {
            scope:
              validated.scope,
          }
        : {}),

      ...(validated.placement !==
      undefined
        ? {
            placement:
              validated.placement,
          }
        : {}),

      ...(validated.order !==
      undefined
        ? {
            order:
              validated.order,
          }
        : {}),

      content:
        validated.content !==
        undefined
          ? {
              ...existing.content,
              ...validated.content,
            }
          : existing.content,

      updatedAt:
        new Date().toISOString(),
    };

    const blocks =
      state.blocks.map(
        (block) =>
          block.id === id
            ? updated
            : block
      );

    await this.write(blocks);

    return updated;
  }

  async archive(
    id: string
  ): Promise<WebsiteContentBlock | null> {
    return this.update(id, {
      status: "ARCHIVED",
    });
  }
}

export const websiteContentBlocksRepository =
  new WebsiteContentBlocksRepository();