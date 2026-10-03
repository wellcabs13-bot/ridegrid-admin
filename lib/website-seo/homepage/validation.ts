import {
  WEBSITE_HOMEPAGE_SECTION_TYPES,
  type WebsiteHomepageConfig,
  type WebsiteHomepageSectionType,
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
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }

  return value;
}

function isSectionType(
  value: string
): value is WebsiteHomepageSectionType {
  return (
    WEBSITE_HOMEPAGE_SECTION_TYPES as readonly string[]
  ).includes(value);
}

export function validateWebsiteHomepageConfig(
  value: unknown
): WebsiteHomepageConfig {
  if (!isRecord(value)) {
    throw new Error(
      "Homepage configuration must be an object."
    );
  }

  if (value.version !== 1) {
    throw new Error(
      "Unsupported homepage configuration version."
    );
  }

  if (!isRecord(value.hero)) {
    throw new Error(
      "Homepage hero configuration is required."
    );
  }

  if (!Array.isArray(value.sections)) {
    throw new Error(
      "Homepage sections must be an array."
    );
  }

  const hero = {
    eyebrow: requiredString(
      value.hero.eyebrow,
      "hero.eyebrow"
    ),

    title: requiredString(
      value.hero.title,
      "hero.title"
    ),

    subtitle: requiredString(
      value.hero.subtitle,
      "hero.subtitle"
    ),

    primaryCtaLabel: requiredString(
      value.hero.primaryCtaLabel,
      "hero.primaryCtaLabel"
    ),

    primaryCtaHref: requiredString(
      value.hero.primaryCtaHref,
      "hero.primaryCtaHref"
    ),

    secondaryCtaLabel: requiredString(
      value.hero.secondaryCtaLabel,
      "hero.secondaryCtaLabel"
    ),

    secondaryCtaHref: requiredString(
      value.hero.secondaryCtaHref,
      "hero.secondaryCtaHref"
    ),
  };

  const seen = new Set<string>();

  const sections = value.sections.map(
    (section, index) => {
      if (!isRecord(section)) {
        throw new Error(
          `Section ${index + 1} is invalid.`
        );
      }

      const type =
        requiredString(
          section.type,
          `sections[${index}].type`
        );

      if (!isSectionType(type)) {
        throw new Error(
          `Invalid homepage section type: ${type}.`
        );
      }

      if (seen.has(type)) {
        throw new Error(
          `Duplicate homepage section type: ${type}.`
        );
      }

      seen.add(type);

      if (
        typeof section.enabled !== "boolean"
      ) {
        throw new Error(
          `sections[${index}].enabled must be boolean.`
        );
      }

      return {
        id:
          requiredString(
            section.id,
            `sections[${index}].id`
          ) || type.toLowerCase(),

        type,

        enabled: section.enabled,

        order:
          typeof section.order === "number"
            ? section.order
            : index,

        heading: requiredString(
          section.heading,
          `sections[${index}].heading`
        ),

        description: requiredString(
          section.description,
          `sections[${index}].description`
        ),
      };
    }
  );

  return {
    version: 1,
    hero,
    sections: sections
      .sort((a, b) => a.order - b.order)
      .map((section, order) => ({
        ...section,
        order,
      })),
  };
}