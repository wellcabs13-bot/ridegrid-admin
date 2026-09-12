import {
  normalizeWebsiteKeyword,
} from "./normalize";

import {
  validateWebsiteKeywordInput,
} from "./validation";

import type {
  CreateWebsiteKeywordInput,
} from "./types";

export function normalizeWebsiteKeywordInput(
  input: CreateWebsiteKeywordInput
) {
  validateWebsiteKeywordInput(input);

  const keyword = input.keyword
    .trim()
    .replace(/\s+/g, " ");

  const normalizedKeyword =
    normalizeWebsiteKeyword(keyword);

  if (!normalizedKeyword) {
    throw new Error(
      "Keyword normalization produced an empty value."
    );
  }

  return {
    keyword,
    normalizedKeyword,

    type:
      input.type ?? "SECONDARY",

    intent:
      input.intent ?? "INFORMATIONAL",

    status:
      input.status ?? "DISCOVERED",

    entityId:
      input.entityId ?? null,

    entityType:
      input.entityType ?? null,

    clusterKey:
      input.clusterKey?.trim() || null,

    primaryKeywordId:
      input.primaryKeywordId ?? null,

    metrics:
      input.metrics ?? null,

    metadata:
      input.metadata ?? null,
  };
}
