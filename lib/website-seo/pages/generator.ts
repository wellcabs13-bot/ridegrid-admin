import { websiteEntityRepository } from "@/lib/website-seo/entities/repository";

import {
  resolveWebsitePagePath,
} from "@/lib/website-seo/templates";

import { websiteTemplateRepository } from "@/lib/website-seo/templates/repository";

import {
  jsonObjectOrNull,
  templateSectionsFromJson,
} from "./json";

import {
  createWebsiteGeneratedPageKey,
} from "./key";

import type {
  GenerateWebsitePageInput,
  WebsiteGeneratedPageDefinition,
} from "./types";

export class WebsitePageGenerator {
  async generate(
    input: GenerateWebsitePageInput
  ): Promise<WebsiteGeneratedPageDefinition> {
    const entityId = input.entityId?.trim();

    if (!entityId) {
      throw new Error("Entity id is required.");
    }

    const entity =
      await websiteEntityRepository.findById(entityId);

    if (!entity) {
      throw new Error("Website entity not found.");
    }

    const template = input.templateId
      ? await websiteTemplateRepository.findById(
          input.templateId
        )
      : await websiteTemplateRepository.findActiveByEntityType(
          entity.type
        );

    if (!template) {
      throw new Error(
        `No template available for ${entity.type}.`
      );
    }

    if (template.entityType !== entity.type) {
      throw new Error(
        "Template entity type does not match entity type."
      );
    }

    if (
      !input.templateId &&
      template.status !== "ACTIVE"
    ) {
      throw new Error(
        "Automatic page generation requires an active template."
      );
    }

    const resolvedPath =
      resolveWebsitePagePath(
        {
          key: template.key,
          entityType: template.entityType,
          pathPattern: template.pathPattern,
        },
        entity.slug
      );

    const sections =
      templateSectionsFromJson(template.sections);

    const pageStatus =
      entity.status === "ACTIVE" &&
      template.status === "ACTIVE"
        ? "READY"
        : "DRAFT";

    return {
      key: createWebsiteGeneratedPageKey(
        entity.type,
        entity.id,
        template.id
      ),
      entityId: entity.id,
      entityType: entity.type,
      entitySlug: entity.slug,
      templateId: template.id,
      templateKey: template.key,
      pathname: resolvedPath.pathname,
      status: pageStatus,
      entity: {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        slug: entity.slug,
        status: entity.status,
        sourceId: entity.sourceId,
        parentId: entity.parentId,
        metadata: jsonObjectOrNull(entity.metadata),
      },
      template: {
        id: template.id,
        name: template.name,
        key: template.key,
        pathPattern: template.pathPattern,
        sections,
        metadata: jsonObjectOrNull(
          template.metadata
        ),
      },
      generation: {
        engine: "RIDEGRID_PAGE_GENERATOR",
        version: 1,
      },
    };
  }
}

export const websitePageGenerator =
  new WebsitePageGenerator();
