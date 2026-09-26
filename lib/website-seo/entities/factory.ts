import { createWebsiteEntitySlug } from "./slug";
import {
  type CreateWebsiteEntityInput,
  type WebsiteEntityStatus,
} from "./types";
import { validateWebsiteEntityInput } from "./validation";

export interface NormalizedWebsiteEntityInput {
  type: CreateWebsiteEntityInput["type"];
  name: string;
  slug: string;
  status: WebsiteEntityStatus;
  sourceId: string | null;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
}

export function normalizeWebsiteEntityInput(
  input: CreateWebsiteEntityInput
): NormalizedWebsiteEntityInput {
  const errors = validateWebsiteEntityInput(input);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const name = input.name.trim();

  const slug = createWebsiteEntitySlug(
    input.slug?.trim() || name
  );

  if (!slug) {
    throw new Error("Entity slug cannot be empty.");
  }

  return {
    type: input.type,
    name,
    slug,
    status: input.status ?? "DRAFT",
    sourceId: input.sourceId ?? null,
    parentId: input.parentId ?? null,
    metadata: input.metadata ?? null,
  };
}
