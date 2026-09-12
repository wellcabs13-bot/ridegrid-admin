import {
  WEBSITE_KEYWORD_INTENTS,
  WEBSITE_KEYWORD_STATUSES,
  WEBSITE_KEYWORD_TYPES,
  type CreateWebsiteKeywordInput,
  type WebsiteKeywordIntent,
  type WebsiteKeywordStatus,
  type WebsiteKeywordType,
} from "./types";

export function isWebsiteKeywordType(
  value: string
): value is WebsiteKeywordType {
  return (
    WEBSITE_KEYWORD_TYPES as readonly string[]
  ).includes(value);
}

export function isWebsiteKeywordIntent(
  value: string
): value is WebsiteKeywordIntent {
  return (
    WEBSITE_KEYWORD_INTENTS as readonly string[]
  ).includes(value);
}

export function isWebsiteKeywordStatus(
  value: string
): value is WebsiteKeywordStatus {
  return (
    WEBSITE_KEYWORD_STATUSES as readonly string[]
  ).includes(value);
}

export function validateWebsiteKeywordInput(
  input: CreateWebsiteKeywordInput
): void {
  if (
    !input.keyword ||
    input.keyword.trim().length < 2
  ) {
    throw new Error(
      "Keyword must contain at least 2 characters."
    );
  }

  if (
    input.type &&
    !isWebsiteKeywordType(input.type)
  ) {
    throw new Error("Invalid keyword type.");
  }

  if (
    input.intent &&
    !isWebsiteKeywordIntent(input.intent)
  ) {
    throw new Error("Invalid keyword intent.");
  }

  if (
    input.status &&
    !isWebsiteKeywordStatus(input.status)
  ) {
    throw new Error("Invalid keyword status.");
  }

  if (
    input.metrics?.searchVolume != null &&
    input.metrics.searchVolume < 0
  ) {
    throw new Error(
      "Search volume cannot be negative."
    );
  }

  if (
    input.metrics?.difficulty != null &&
    (
      input.metrics.difficulty < 0 ||
      input.metrics.difficulty > 100
    )
  ) {
    throw new Error(
      "Keyword difficulty must be between 0 and 100."
    );
  }

  if (
    input.metrics?.opportunityScore != null &&
    (
      input.metrics.opportunityScore < 0 ||
      input.metrics.opportunityScore > 100
    )
  ) {
    throw new Error(
      "Opportunity score must be between 0 and 100."
    );
  }
}
