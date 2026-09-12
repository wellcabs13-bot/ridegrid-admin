import type { WebsiteEntityType } from "@/lib/website-seo/entities";

import { getDefaultWebsiteEntityPathPattern } from "./patterns";
import type {
  CreateWebsitePageTemplateInput,
  WebsiteTemplateSection,
} from "./types";

function section(
  id: string,
  type: WebsiteTemplateSection["type"],
  order: number
): WebsiteTemplateSection {
  return {
    id,
    type,
    enabled: true,
    order,
  };
}

const COMMON_SECTIONS: WebsiteTemplateSection[] = [
  section("hero", "HERO", 0),
  section("search", "SEARCH", 1),
  section("overview", "OVERVIEW", 2),
  section("marketplace", "MARKETPLACE", 3),
  section("trust", "TRUST", 4),
  section("faq", "FAQ", 5),
  section("related", "RELATED", 6),
  section("cta", "CTA", 7),
];

export function createDefaultWebsiteTemplateDefinition(
  entityType: WebsiteEntityType
): CreateWebsitePageTemplateInput {
  const label =
    entityType.charAt(0) +
    entityType.slice(1).toLowerCase();

  return {
    name: `${label} Page`,
    key: `${entityType.toLowerCase()}-page`,
    entityType,
    status: "DRAFT",
    pathPattern:
      getDefaultWebsiteEntityPathPattern(entityType),
    sections: COMMON_SECTIONS.map((item) => ({
      ...item,
    })),
    metadata: {
      systemDefault: true,
      version: 1,
    },
  };
}
