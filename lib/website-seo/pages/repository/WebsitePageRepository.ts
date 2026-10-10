import {
  Prisma,
  type WebsiteSeoEntityType,
  type WebsiteSeoPageStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type {
  WebsiteGeneratedPageDefinition,
} from "@/lib/website-seo/pages/types";

export interface WebsitePageListOptions {
  status?: WebsiteSeoPageStatus;
  entityType?: WebsiteSeoEntityType;
  entityId?: string;
  templateId?: string;
  search?: string;
}

export class WebsitePageRepository {
  async list(options: WebsitePageListOptions = {}) {
    const search = options.search?.trim();

    return prisma.websiteSeoPage.findMany({
      where: {
        ...(options.status
          ? { status: options.status }
          : {}),
        ...(options.entityId
          ? { entityId: options.entityId }
          : {}),
        ...(options.templateId
          ? { templateId: options.templateId }
          : {}),
        ...(options.entityType
          ? {
              entity: {
                type: options.entityType,
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  pathname: {
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
                  entity: {
                    name: {
                      contains: search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        entity: true,
        template: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.websiteSeoPage.findUnique({
      where: { id },
      include: {
        entity: true,
        template: true,
      },
    });
  }

  async findByKey(key: string) {
    return prisma.websiteSeoPage.findUnique({
      where: { key },
      include: {
        entity: true,
        template: true,
      },
    });
  }

  async findByPathname(pathname: string) {
    return prisma.websiteSeoPage.findUnique({
      where: { pathname },
      include: {
        entity: true,
        template: true,
      },
    });
  }

  async persist(
    definition: WebsiteGeneratedPageDefinition
  ) {
    const metadata = {
      entity: definition.entity,
      template: definition.template,
      generation: definition.generation,
    } as unknown as Prisma.InputJsonValue;

    return prisma.websiteSeoPage.upsert({
      where: {
        entityId_templateId: {
          entityId: definition.entityId,
          templateId: definition.templateId,
        },
      },
      create: {
        key: definition.key,
        pathname: definition.pathname,
        status: definition.status,
        entityId: definition.entityId,
        templateId: definition.templateId,
        generationVersion:
          definition.generation.version,
        metadata,
      },
      update: {
        key: definition.key,
        pathname: definition.pathname,
        status: definition.status,
        generationVersion:
          definition.generation.version,
        metadata,
      },
      include: {
        entity: true,
        template: true,
      },
    });
  }

  async remove(id: string) {
    const existing =
      await prisma.websiteSeoPage.findUnique({
        where: { id },
      });

    if (!existing) {
      return null;
    }

    return prisma.websiteSeoPage.delete({
      where: { id },
    });
  }
}

export const websitePageRepository =
  new WebsitePageRepository();
