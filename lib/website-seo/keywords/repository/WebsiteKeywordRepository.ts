import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { persistKeywordAnalysis } from "./persistKeywordAnalysis";
import type { KeywordAnalysis } from "../engine/analyze";

import {
  normalizeWebsiteKeyword,
  normalizeWebsiteKeywordInput,
} from "@/lib/website-seo/keywords";

import type {
  CreateWebsiteKeywordInput,
  UpdateWebsiteKeywordInput,
  WebsiteKeywordIntent,
  WebsiteKeywordStatus,
  WebsiteKeywordType,
} from "@/lib/website-seo/keywords";

export interface WebsiteKeywordListFilters {
  search?: string;
  type?: WebsiteKeywordType;
  intent?: WebsiteKeywordIntent;
  status?: WebsiteKeywordStatus;
  entityId?: string;
  entityType?: string;
  clusterKey?: string;
}

function toJsonInput(
  value: Record<string, unknown> | object | null | undefined
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

export class WebsiteKeywordRepository {
  async persistAnalysis(analysis: KeywordAnalysis) {
    return persistKeywordAnalysis(analysis);
  }

  async list(filters: WebsiteKeywordListFilters = {}) {
    const where: Prisma.WebsiteSeoKeywordWhereInput = {};

    if (filters.search?.trim()) {
      where.keyword = {
        contains: filters.search.trim(),
        mode: "insensitive",
      };
    }

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.intent) {
      where.intent = filters.intent;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.entityType) {
      where.entityType =
        filters.entityType as Prisma.EnumWebsiteSeoEntityTypeFilter["equals"];
    }

    if (filters.clusterKey) {
      where.clusterKey = filters.clusterKey;
    }

    return prisma.websiteSeoKeyword.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { keyword: "asc" },
      ],
    });
  }

  async findById(id: string) {
    return prisma.websiteSeoKeyword.findUnique({
      where: { id },
    });
  }

  async findByNormalizedKeyword(
    keyword: string,
    entityId?: string | null
  ) {
    const normalizedKeyword =
      normalizeWebsiteKeyword(keyword);

    return prisma.websiteSeoKeyword.findFirst({
      where: {
        normalizedKeyword,
        entityId: entityId ?? null,
      },
    });
  }

  async create(input: CreateWebsiteKeywordInput) {
    const data = normalizeWebsiteKeywordInput(input);

    return prisma.websiteSeoKeyword.create({
      data: {
        keyword: data.keyword,
        normalizedKeyword: data.normalizedKeyword,
        type: data.type,
        intent: data.intent,
        status: data.status,
        entityId: data.entityId,
        entityType: data.entityType,
        clusterKey: data.clusterKey,
        primaryKeywordId: data.primaryKeywordId,
        metrics: toJsonInput(data.metrics),
        metadata: toJsonInput(data.metadata),
      },
    });
  }

  async update(
    id: string,
    input: UpdateWebsiteKeywordInput
  ) {
    const existing = await this.findById(id);

    if (!existing) {
      return null;
    }

    const data: Prisma.WebsiteSeoKeywordUpdateInput = {};

    if (input.keyword !== undefined) {
      const keyword = input.keyword
        .trim()
        .replace(/\s+/g, " ");

      if (keyword.length < 2) {
        throw new Error(
          "Keyword must contain at least 2 characters."
        );
      }

      data.keyword = keyword;
      data.normalizedKeyword =
        normalizeWebsiteKeyword(keyword);
    }

    if (input.type !== undefined) {
      data.type = input.type;
    }

    if (input.intent !== undefined) {
      data.intent = input.intent;
    }

    if (input.status !== undefined) {
      data.status = input.status;
    }

    if (input.entityType !== undefined) {
      data.entityType = input.entityType;
    }

    if (input.clusterKey !== undefined) {
      data.clusterKey =
        input.clusterKey?.trim() || null;
    }

    if (input.metrics !== undefined) {
      data.metrics = toJsonInput(input.metrics);
    }

    if (input.metadata !== undefined) {
      data.metadata = toJsonInput(input.metadata);
    }

    if (input.entityId !== undefined) {
      data.entity =
        input.entityId === null
          ? { disconnect: true }
          : { connect: { id: input.entityId } };
    }

    if (input.primaryKeywordId !== undefined) {
      data.primaryKeyword =
        input.primaryKeywordId === null
          ? { disconnect: true }
          : {
              connect: {
                id: input.primaryKeywordId,
              },
            };
    }

    return prisma.websiteSeoKeyword.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const existing = await this.findById(id);

    if (!existing) {
      return false;
    }

    await prisma.websiteSeoKeyword.delete({
      where: { id },
    });

    return true;
  }
}

export const websiteKeywordRepository =
  new WebsiteKeywordRepository();
