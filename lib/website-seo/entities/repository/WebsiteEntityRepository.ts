import {
  Prisma,
  type WebsiteSeoEntityStatus,
  type WebsiteSeoEntityType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  normalizeWebsiteEntityInput,
  type CreateWebsiteEntityInput,
  type UpdateWebsiteEntityInput,
} from "@/lib/website-seo/entities";

export interface WebsiteEntityListOptions {
  type?: WebsiteSeoEntityType;
  status?: WebsiteSeoEntityStatus;
  search?: string;
  parentId?: string;
}

function toPrismaMetadata(
  value: Record<string, unknown> | null
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

export class WebsiteEntityRepository {
  async list(options: WebsiteEntityListOptions = {}) {
    const search = options.search?.trim();

    return prisma.websiteSeoEntity.findMany({
      where: {
        ...(options.type ? { type: options.type } : {}),
        ...(options.status ? { status: options.status } : {}),
        ...(options.parentId ? { parentId: options.parentId } : {}),
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
                  slug: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  async findById(id: string) {
    return prisma.websiteSeoEntity.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async findByTypeAndSlug(
    type: WebsiteSeoEntityType,
    slug: string
  ) {
    return prisma.websiteSeoEntity.findUnique({
      where: {
        type_slug: {
          type,
          slug,
        },
      },
    });
  }

  async create(input: CreateWebsiteEntityInput) {
    const normalized = normalizeWebsiteEntityInput(input);

    return prisma.websiteSeoEntity.create({
      data: {
        type: normalized.type,
        name: normalized.name,
        slug: normalized.slug,
        status: normalized.status,
        sourceId: normalized.sourceId,
        parentId: normalized.parentId,
        metadata: toPrismaMetadata(normalized.metadata),
      },
    });
  }

  async update(
    id: string,
    input: UpdateWebsiteEntityInput
  ) {
    const existing = await prisma.websiteSeoEntity.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    const shouldNormalize =
      input.name !== undefined ||
      input.slug !== undefined ||
      input.status !== undefined;

    let data: Prisma.WebsiteSeoEntityUncheckedUpdateInput;

    if (shouldNormalize) {
      const normalized = normalizeWebsiteEntityInput({
        type: existing.type,
        name: input.name ?? existing.name,
        slug: input.slug ?? existing.slug,
        status: input.status ?? existing.status,
        sourceId:
          input.sourceId !== undefined
            ? input.sourceId
            : existing.sourceId,
        parentId:
          input.parentId !== undefined
            ? input.parentId
            : existing.parentId,
        metadata:
          input.metadata !== undefined
            ? input.metadata
            : ((existing.metadata as Record<string, unknown> | null) ?? null),
      });

      data = {
        type: normalized.type,
        name: normalized.name,
        slug: normalized.slug,
        status: normalized.status,
        sourceId: normalized.sourceId,
        parentId: normalized.parentId,
        metadata: toPrismaMetadata(normalized.metadata),
      };
    } else {
      data = {
        ...(input.sourceId !== undefined
          ? { sourceId: input.sourceId }
          : {}),
        ...(input.parentId !== undefined
          ? { parentId: input.parentId }
          : {}),
        ...(input.metadata !== undefined
          ? { metadata: toPrismaMetadata(input.metadata) }
          : {}),
      };
    }

    return prisma.websiteSeoEntity.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const existing = await prisma.websiteSeoEntity.findUnique({
      where: { id },
    });

    if (!existing) {
      return null;
    }

    return prisma.websiteSeoEntity.delete({
      where: { id },
    });
  }
}

export const websiteEntityRepository =
  new WebsiteEntityRepository();
