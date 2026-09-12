import {
  WEBSITE_ENTITY_STATUSES,
  WEBSITE_ENTITY_TYPES,
  type CreateWebsiteEntityInput,
  type WebsiteEntityStatus,
  type WebsiteEntityType,
} from "./types";

export function isWebsiteEntityType(
  value: unknown
): value is WebsiteEntityType {
  return (
    typeof value === "string" &&
    WEBSITE_ENTITY_TYPES.includes(value as WebsiteEntityType)
  );
}

export function isWebsiteEntityStatus(
  value: unknown
): value is WebsiteEntityStatus {
  return (
    typeof value === "string" &&
    WEBSITE_ENTITY_STATUSES.includes(value as WebsiteEntityStatus)
  );
}

export function validateWebsiteEntityInput(
  input: CreateWebsiteEntityInput
): string[] {
  const errors: string[] = [];

  if (!isWebsiteEntityType(input.type)) {
    errors.push("Invalid website entity type.");
  }

  if (
    typeof input.name !== "string" ||
    input.name.trim().length < 2
  ) {
    errors.push("Entity name must contain at least 2 characters.");
  }

  if (
    input.status !== undefined &&
    !isWebsiteEntityStatus(input.status)
  ) {
    errors.push("Invalid website entity status.");
  }

  return errors;
}
