import {
  WEBSITE_ENTITY_TYPES,
  type WebsiteEntityType,
} from "@/lib/website-seo/entities";

import {
  createDefaultWebsiteTemplateDefinition,
} from "@/lib/website-seo/templates/defaults";

import {
  websiteTemplateRepository,
} from "@/lib/website-seo/templates/repository";

export interface WebsiteDefaultTemplateBootstrapItem {
  entityType: WebsiteEntityType;
  templateId: string;
  templateKey: string;
  action: "CREATED" | "EXISTING";
}

export interface WebsiteDefaultTemplateBootstrapResult {
  total: number;
  created: number;
  existing: number;
  templates: WebsiteDefaultTemplateBootstrapItem[];
}

export async function bootstrapDefaultWebsiteTemplates():
  Promise<WebsiteDefaultTemplateBootstrapResult> {
  const templates: WebsiteDefaultTemplateBootstrapItem[] = [];

  let created = 0;
  let existing = 0;

  for (const entityType of WEBSITE_ENTITY_TYPES) {
    const definition =
      createDefaultWebsiteTemplateDefinition(entityType);

    const templateKey = definition.key;

    if (!templateKey) {
      throw new Error(
        `Default template key missing for ${entityType}.`
      );
    }

    const current =
      await websiteTemplateRepository.findByKey(
        templateKey
      );

    if (current) {
      if (current.entityType !== entityType) {
        throw new Error(
          `Template key collision: ${definition.key} belongs to ${current.entityType}, expected ${entityType}.`
        );
      }

      existing += 1;

      templates.push({
        entityType,
        templateId: current.id,
        templateKey: current.key,
        action: "EXISTING",
      });

      continue;
    }

    const template =
      await websiteTemplateRepository.create(
        definition
      );

    created += 1;

    templates.push({
      entityType,
      templateId: template.id,
      templateKey: template.key,
      action: "CREATED",
    });
  }

  return {
    total: templates.length,
    created,
    existing,
    templates,
  };
}

