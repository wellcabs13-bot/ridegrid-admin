import type { WebsiteEntityType } from "@/lib/website-seo/entities";

import { createWebsiteTemplateKey } from "./key";
import { getDefaultWebsiteEntityPathPattern } from "./patterns";
import {
  type CreateWebsitePageTemplateInput,
  type WebsiteTemplateSection,
  type WebsiteTemplateStatus,
} from "./types";
import { validateWebsitePageTemplateInput } from "./validation";

export interface NormalizedWebsitePageTemplateInput {
  name: string;
  key: string;
  entityType: WebsiteEntityType;
  status: WebsiteTemplateStatus;
  pathPattern: string;
  sections: WebsiteTemplateSection[];
  metadata: Record<string, unknown> | null;
}

export function normalizeWebsitePageTemplateInput(
  input: CreateWebsitePageTemplateInput
): NormalizedWebsitePageTemplateInput {
  const normalized: CreateWebsitePageTemplateInput = {
    ...input,
    name: input.name?.trim(),
    key: input.key?.trim(),
    pathPattern:
      input.pathPattern?.trim() ||
      getDefaultWebsiteEntityPathPattern(input.entityType),
    sections: [...(input.sections ?? [])].sort(
      (a, b) => a.order - b.order
    ),
  };

  validateWebsitePageTemplateInput(normalized);

  return {
    name: normalized.name,
    key: createWebsiteTemplateKey(
      normalized.key || normalized.name
    ),
    entityType: normalized.entityType,
    status: normalized.status ?? "DRAFT",
    pathPattern: normalized.pathPattern,
    sections: normalized.sections ?? [],
    metadata: normalized.metadata ?? null,
  };
}
