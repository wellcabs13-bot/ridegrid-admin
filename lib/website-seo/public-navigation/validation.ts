import {
  WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES,
  WEBSITE_PUBLIC_NAVIGATION_LOCATIONS,
  type CreateWebsitePublicNavigationItemInput,
  type UpdateWebsitePublicNavigationItemInput,
  type WebsitePublicNavigationItem,
  type WebsitePublicNavigationLinkType,
  type WebsitePublicNavigationLocation,
  type WebsitePublicNavigationStore,
} from "./types";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requiredString(
  value: unknown,
  field: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${field} is required.`
    );
  }

  return value.trim();
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T {
  if (
    typeof value !== "string" ||
    !allowed.includes(value as T)
  ) {
    throw new Error(
      `${field} contains an unsupported value.`
    );
  }

  return value as T;
}

export function assertWebsitePublicNavigationHref(
  href: string,
  linkType: WebsitePublicNavigationLinkType
): void {
  if (linkType === "INTERNAL") {
    if (!/^\/(?!\/)/.test(href)) {
      throw new Error(
        "Internal navigation links must begin with a single /."
      );
    }

    return;
  }

  let url: URL;

  try {
    url = new URL(href);
  } catch {
    throw new Error(
      "External navigation links must be valid URLs."
    );
  }

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "External navigation links must use http or https."
    );
  }
}

export function validateCreateWebsitePublicNavigationItemInput(
  value: unknown
): CreateWebsitePublicNavigationItemInput {
  if (!isRecord(value)) {
    throw new Error(
      "Navigation item request must be an object."
    );
  }

  const label =
    requiredString(
      value.label,
      "label"
    );

  const href =
    requiredString(
      value.href,
      "href"
    );

  const location =
    enumValue(
      value.location,
      WEBSITE_PUBLIC_NAVIGATION_LOCATIONS,
      "location"
    );

  const linkType =
    enumValue(
      value.linkType,
      WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES,
      "linkType"
    );

  assertWebsitePublicNavigationHref(
    href,
    linkType
  );

  if (
    value.enabled !== undefined &&
    typeof value.enabled !== "boolean"
  ) {
    throw new Error(
      "enabled must be boolean."
    );
  }

  if (
    value.openInNewTab !== undefined &&
    typeof value.openInNewTab !== "boolean"
  ) {
    throw new Error(
      "openInNewTab must be boolean."
    );
  }

  return {
    label,
    href,
    location,
    linkType,
    enabled:
      value.enabled === undefined
        ? true
        : value.enabled,
    openInNewTab:
      value.openInNewTab === undefined
        ? false
        : value.openInNewTab,
  };
}

export function validateUpdateWebsitePublicNavigationItemInput(
  value: unknown
): UpdateWebsitePublicNavigationItemInput {
  if (!isRecord(value)) {
    throw new Error(
      "Navigation item update must be an object."
    );
  }

  const result: UpdateWebsitePublicNavigationItemInput = {};

  if (value.label !== undefined) {
    result.label =
      requiredString(
        value.label,
        "label"
      );
  }

  if (value.href !== undefined) {
    result.href =
      requiredString(
        value.href,
        "href"
      );
  }

  if (value.location !== undefined) {
    result.location =
      enumValue(
        value.location,
        WEBSITE_PUBLIC_NAVIGATION_LOCATIONS,
        "location"
      );
  }

  if (value.linkType !== undefined) {
    result.linkType =
      enumValue(
        value.linkType,
        WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES,
        "linkType"
      );
  }

  if (value.enabled !== undefined) {
    if (typeof value.enabled !== "boolean") {
      throw new Error(
        "enabled must be boolean."
      );
    }

    result.enabled =
      value.enabled;
  }

  if (value.openInNewTab !== undefined) {
    if (
      typeof value.openInNewTab !== "boolean"
    ) {
      throw new Error(
        "openInNewTab must be boolean."
      );
    }

    result.openInNewTab =
      value.openInNewTab;
  }

  if (value.order !== undefined) {
    if (
      typeof value.order !== "number" ||
      !Number.isInteger(value.order) ||
      value.order < 0
    ) {
      throw new Error(
        "order must be a non-negative integer."
      );
    }

    result.order =
      value.order;
  }

  return result;
}

function parseStoredItem(
  value: unknown,
  index: number
): WebsitePublicNavigationItem {
  if (!isRecord(value)) {
    throw new Error(
      `Stored navigation item ${index + 1} is invalid.`
    );
  }

  const label =
    requiredString(
      value.label,
      "label"
    );

  const href =
    requiredString(
      value.href,
      "href"
    );

  const location =
    enumValue(
      value.location,
      WEBSITE_PUBLIC_NAVIGATION_LOCATIONS,
      "location"
    );

  const linkType =
    enumValue(
      value.linkType,
      WEBSITE_PUBLIC_NAVIGATION_LINK_TYPES,
      "linkType"
    );

  assertWebsitePublicNavigationHref(
    href,
    linkType
  );

  return {
    id: requiredString(
      value.id,
      "id"
    ),

    label,
    href,
    location,
    linkType,

    enabled:
      typeof value.enabled === "boolean"
        ? value.enabled
        : true,

    openInNewTab:
      typeof value.openInNewTab === "boolean"
        ? value.openInNewTab
        : false,

    order:
      typeof value.order === "number" &&
      Number.isInteger(value.order) &&
      value.order >= 0
        ? value.order
        : index,

    createdAt:
      requiredString(
        value.createdAt,
        "createdAt"
      ),

    updatedAt:
      requiredString(
        value.updatedAt,
        "updatedAt"
      ),
  };
}

export function validateWebsitePublicNavigationStore(
  value: unknown
): WebsitePublicNavigationStore {
  if (!isRecord(value)) {
    throw new Error(
      "Stored navigation configuration must be an object."
    );
  }

  if (value.version !== 1) {
    throw new Error(
      "Unsupported navigation configuration version."
    );
  }

  if (!Array.isArray(value.items)) {
    throw new Error(
      "Stored navigation items must be an array."
    );
  }

  return {
    version: 1,
    items:
      value.items.map(
        parseStoredItem
      ),
  };
}