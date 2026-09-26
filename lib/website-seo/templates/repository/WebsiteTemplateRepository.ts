import {
  Prisma,
  type WebsiteSeoEntityType,
  type WebsiteSeoTemplateStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  normalizeWebsitePageTemplateInput,
  type CreateWebsitePageTemplateInput,
  type UpdateWebsitePageTemplateInput,
  type WebsiteTemplateSection,
} from "@/lib/website-seo/templates";

export interface WebsiteTemplateListOptions {
  entityType?: WebsiteSeoEntityType;
  status?: WebsiteSeoTemplateStatus;
  search?: string;
}

function toJson(
  value: Record<string, unknown> | WebsiteTemplateSection[]
): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toNullableJson(
  value: Record<string, unknown> | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

export class WebsiteTemplateRepository {
  async list(options: WebsiteTemplateListOptions = {}) {
    const search = options.search?.trim();

    return prisma.websiteSeoTemplate.findMany({
      where: {
        ...(options.entityType
          ? { entityType: options.entityType }
          : {}),
        ...(options.status
          ? { status: options.status }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  key: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  pathPattern: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        { entityType: "asc" },
        { name: "asc" },
      ],
    });
  }

  async findById(id: string) {
    return prisma.websiteSeoTemplate.findUnique({
      where: { id },
    });
  }

  async findByKey(key: string) {
    return prisma.websiteSeoTemplate.findUnique({
      where: { key },
    });
  }

  async findActiveByEntityType(
    entityType: WebsiteSeoEntityType
  ) {
    return prisma.websiteSeoTemplate.findFirst({
      where: {
        entityType,
        status: "ACTIVE",
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async create(input: CreateWebsitePageTemplateInput) {
    const normalized =
      normalizeWebsitePageTemplateInput(input);

    return prisma.websiteSeoTemplate.create({
      data: {
        name: normalized.name,
        key: normalized.key,
        entityType: normalized.entityType,
        status: normalized.status,
        pathPattern: normalized.pathPattern,
        sections: toJson(normalized.sections),
        metadata: toNullableJson(normalized.metadata),
      },
    });
  }

  async update(
    id: string,
    input: UpdateWebsitePageTemplateInput
  ) {
    const existing =
      await prisma.websiteSeoTemplate.findUnique({
        where: { id },
      });

    if (!existing) {
      return null;
    }

    const existingSections =
      Array.isArray(existing.sections)
        ? (existing.sections as unknown as WebsiteTemplateSection[])
        : [];

    const existingMetadata =
      existing.metadata &&
      typeof existing.metadata === "object" &&
      !Array.isArray(existing.metadata)
        ? (existing.metadata as Record<string, unknown>)
        : null;

    const normalized =
      normalizeWebsitePageTemplateInput({
        name: input.name ?? existing.name,
        key: input.key ?? existing.key,
        entityType: existing.entityType,
        status: input.status ?? existing.status,
        pathPattern:
          input.pathPattern ?? existing.pathPattern,
        sections:
          input.sections ?? existingSections,
        metadata:
          input.metadata !== undefined
            ? input.metadata
            : existingMetadata,
      });

    return prisma.websiteSeoTemplate.update({
      where: { id },
      data: {
        name: normalized.name,
        key: normalized.key,
        status: normalized.status,
        pathPattern: normalized.pathPattern,
        sections: toJson(normalized.sections),
        metadata: toNullableJson(normalized.metadata),
      },
    });
  }

  async remove(id: string) {
    const existing =
      await prisma.websiteSeoTemplate.findUnique({
        where: { id },
      });

    if (!existing) {
      return null;
    }

    return prisma.websiteSeoTemplate.delete({
      where: { id },
    });
  }
}

export const websiteTemplateRepository =
  new WebsiteTemplateRepository();
