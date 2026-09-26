import {
  WEBSITE_CONTENT_BLOCK_CATEGORIES,
  WEBSITE_CONTENT_BLOCK_PLACEMENTS,
  WEBSITE_CONTENT_BLOCK_SCOPES,
  WEBSITE_CONTENT_BLOCK_STATUSES,
  type CreateWebsiteContentBlockInput,
  type UpdateWebsiteContentBlockInput,
  type WebsiteContentBlock,
  type WebsiteContentBlockCategory,
  type WebsiteContentBlockContent,
  type WebsiteContentBlockPlacement,
  type WebsiteContentBlockScope,
  type WebsiteContentBlockStatus,
  type WebsiteContentBlockStore,
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

function optionalString(
  value: unknown
): string | undefined {
  return typeof value === "string"
    ? value.trim()
    : undefined;
}

function requiredString(
  value: unknown,
  field: string
): string {
  const text = optionalString(value);

  if (!text) {
    throw new Error(`${field} is required.`);
  }

  return text;
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

function optionalEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): T | undefined {
  if (value === undefined) {
    return undefined;
  }

  return enumValue(
    value,
    allowed,
    field
  );
}

export function normalizeWebsiteContentBlockKey(
  value: string
): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseContent(
  value: unknown
): Partial<WebsiteContentBlockContent> {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(
      "content must be an object."
    );
  }

  const result: Partial<WebsiteContentBlockContent> = {};

  for (const key of [
    "eyebrow",
    "heading",
    "body",
    "ctaLabel",
    "ctaHref",
  ] as const) {
    if (value[key] !== undefined) {
      if (typeof value[key] !== "string") {
        throw new Error(
          `content.${key} must be a string.`
        );
      }

      result[key] =
        value[key] as string;
    }
  }

  return result;
}

export function validateCreateWebsiteContentBlockInput(
  value: unknown
): CreateWebsiteContentBlockInput {
  if (!isRecord(value)) {
    throw new Error(
      "Content block request must be an object."
    );
  }

  const key =
    optionalString(value.key);

  return {
    name: requiredString(
      value.name,
      "name"
    ),

    ...(key
      ? {
          key:
            normalizeWebsiteContentBlockKey(
              key
            ),
        }
      : {}),

    status:
      optionalEnum(
        value.status,
        WEBSITE_CONTENT_BLOCK_STATUSES,
        "status"
      ) ?? "DRAFT",

    category: enumValue(
      value.category,
      WEBSITE_CONTENT_BLOCK_CATEGORIES,
      "category"
    ),

    scope: enumValue(
      value.scope,
      WEBSITE_CONTENT_BLOCK_SCOPES,
      "scope"
    ),

    placement: enumValue(
      value.placement,
      WEBSITE_CONTENT_BLOCK_PLACEMENTS,
      "placement"
    ),

    content:
      parseContent(
        value.content
      ),
  };
}

export function validateUpdateWebsiteContentBlockInput(
  value: unknown
): UpdateWebsiteContentBlockInput {
  if (!isRecord(value)) {
    throw new Error(
      "Content block update must be an object."
    );
  }

  const result: UpdateWebsiteContentBlockInput = {};

  if (value.name !== undefined) {
    result.name = requiredString(
      value.name,
      "name"
    );
  }

  if (value.key !== undefined) {
    const rawKey = requiredString(
      value.key,
      "key"
    );

    const normalized =
      normalizeWebsiteContentBlockKey(
        rawKey
      );

    if (!normalized) {
      throw new Error(
        "key is invalid."
      );
    }

    result.key = normalized;
  }

  const status = optionalEnum(
    value.status,
    WEBSITE_CONTENT_BLOCK_STATUSES,
    "status"
  );

  if (status) {
    result.status =
      status as WebsiteContentBlockStatus;
  }

  const category = optionalEnum(
    value.category,
    WEBSITE_CONTENT_BLOCK_CATEGORIES,
    "category"
  );

  if (category) {
    result.category =
      category as WebsiteContentBlockCategory;
  }

  const scope = optionalEnum(
    value.scope,
    WEBSITE_CONTENT_BLOCK_SCOPES,
    "scope"
  );

  if (scope) {
    result.scope =
      scope as WebsiteContentBlockScope;
  }

  const placement = optionalEnum(
    value.placement,
    WEBSITE_CONTENT_BLOCK_PLACEMENTS,
    "placement"
  );

  if (placement) {
    result.placement =
      placement as WebsiteContentBlockPlacement;
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

    result.order = value.order;
  }

  if (value.content !== undefined) {
    result.content =
      parseContent(
        value.content
      );
  }

  return result;
}

function parseStoredBlock(
  value: unknown,
  index: number
): WebsiteContentBlock {
  if (!isRecord(value)) {
    throw new Error(
      `Stored content block ${index + 1} is invalid.`
    );
  }

  const content =
    parseContent(
      value.content
    );

  return {
    id: requiredString(
      value.id,
      "id"
    ),

    name: requiredString(
      value.name,
      "name"
    ),

    key: requiredString(
      value.key,
      "key"
    ),

    status: enumValue(
      value.status,
      WEBSITE_CONTENT_BLOCK_STATUSES,
      "status"
    ),

    category: enumValue(
      value.category,
      WEBSITE_CONTENT_BLOCK_CATEGORIES,
      "category"
    ),

    scope: enumValue(
      value.scope,
      WEBSITE_CONTENT_BLOCK_SCOPES,
      "scope"
    ),

    placement: enumValue(
      value.placement,
      WEBSITE_CONTENT_BLOCK_PLACEMENTS,
      "placement"
    ),

    order:
      typeof value.order === "number" &&
      Number.isInteger(value.order) &&
      value.order >= 0
        ? value.order
        : index,

    content: {
      eyebrow:
        content.eyebrow ?? "",
      heading:
        content.heading ?? "",
      body:
        content.body ?? "",
      ctaLabel:
        content.ctaLabel ?? "",
      ctaHref:
        content.ctaHref ?? "",
    },

    createdAt: requiredString(
      value.createdAt,
      "createdAt"
    ),

    updatedAt: requiredString(
      value.updatedAt,
      "updatedAt"
    ),
  };
}

export function validateWebsiteContentBlockStore(
  value: unknown
): WebsiteContentBlockStore {
  if (!isRecord(value)) {
    throw new Error(
      "Stored content block configuration must be an object."
    );
  }

  if (value.version !== 1) {
    throw new Error(
      "Unsupported content block store version."
    );
  }

  if (!Array.isArray(value.blocks)) {
    throw new Error(
      "Stored content blocks must be an array."
    );
  }

  return {
    version: 1,

    blocks:
      value.blocks
        .map(parseStoredBlock)
        .sort(
          (a, b) =>
            a.order - b.order ||
            a.name.localeCompare(
              b.name
            )
        ),
  };
}