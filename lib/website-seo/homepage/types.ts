export const WEBSITE_HOMEPAGE_SECTION_TYPES = [
  "HERO",
  "SEARCH",
  "TRUST",
  "ROUTES",
  "MARKETPLACE",
  "CONTENT",
  "REVIEWS",
  "CTA",
] as const;

export type WebsiteHomepageSectionType =
  (typeof WEBSITE_HOMEPAGE_SECTION_TYPES)[number];

export interface WebsiteHomepageHero {
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
}

export interface WebsiteHomepageSection {
  id: string;
  type: WebsiteHomepageSectionType;
  enabled: boolean;
  order: number;
  heading: string;
  description: string;
}

export interface WebsiteHomepageConfig {
  version: 1;
  hero: WebsiteHomepageHero;
  sections: WebsiteHomepageSection[];
}

export interface WebsiteHomepageSetting {
  configured: boolean;
  config: WebsiteHomepageConfig | null;
  updatedAt: string | null;
}

export const EMPTY_WEBSITE_HOMEPAGE_CONFIG: WebsiteHomepageConfig = {
  version: 1,

  hero: {
    eyebrow: "",
    title: "",
    subtitle: "",
    primaryCtaLabel: "",
    primaryCtaHref: "",
    secondaryCtaLabel: "",
    secondaryCtaHref: "",
  },

  sections: WEBSITE_HOMEPAGE_SECTION_TYPES.map(
    (type, index) => ({
      id: type.toLowerCase(),
      type,
      enabled: true,
      order: index,
      heading: "",
      description: "",
    })
  ),
};