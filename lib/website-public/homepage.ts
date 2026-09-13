import { websiteHomepageRepository } from "../website-seo/homepage/repository";
import type { WebsiteHomepageConfig } from "../website-seo/homepage/types";

import { publicHref } from "./safety";

import {
  resolveDiscovery,
  resolvePublicChrome,
} from "./repository";

// Presentation fallback only.
// Dashboard configuration always wins when configured.
const fallback: WebsiteHomepageConfig = {
  version: 1,

  hero: {
    eyebrow:
      "OUTSTATION / LOCAL / AIRPORT / CORPORATE",

    title:
      "Travel Further With Confidence",

    subtitle:
      "Search current RideGrid options for outstation, local, airport and business travel with Wellcabs.",

    primaryCtaLabel:
      "Book a Cab",

    primaryCtaHref:
      "/#ride-search",

    secondaryCtaLabel:
      "Explore services",

    secondaryCtaHref:
      "/#services",
  },

  sections: [
    {
      id: "hero",
      type: "HERO",
      enabled: true,
      order: 0,
      heading: "",
      description: "",
    },

    {
      id: "search",
      type: "SEARCH",
      enabled: true,
      order: 1,
      heading:
        "Where are we taking you?",
      description:
        "Choose your journey and search current RideGrid vehicle options.",
    },

    {
      id: "routes",
      type: "ROUTES",
      enabled: true,
      order: 2,
      heading:
        "Popular routes available on RideGrid",
      description:
        "Explore current journeys available through the RideGrid marketplace.",
    },

    {
      id: "marketplace",
      type: "MARKETPLACE",
      enabled: true,
      order: 3,
      heading:
        "Find the right ride for your plans.",
      description:
        "Search your journey details to see current RideGrid vehicle options.",
    },

    {
      id: "cta",
      type: "CTA",
      enabled: true,
      order: 4,
      heading:
        "Book with RideGrid.",
      description:
        "Search current RideGrid options and continue through the connected booking flow.",
    },
  ],
};

export function homepagePresentation(
  config: WebsiteHomepageConfig | null,
) {
  const source =
    config ?? fallback;

  return {
    hero: {
      ...source.hero,

      primaryCtaHref:
        publicHref(
          source.hero.primaryCtaHref,
        ) || "",

      secondaryCtaHref:
        publicHref(
          source.hero.secondaryCtaHref,
        ) || "",
    },

    sections:
      source.sections
        .filter(
          (section) =>
            section.enabled,
        )
        .sort(
          (a, b) =>
            a.order - b.order,
        )
        .map(
          (section) => ({
            id: section.id,
            type: section.type,
            heading:
              section.heading,
            description:
              section.description,
          }),
        ),
  };
}

export async function resolveHomepage() {
  const [
    setting,
    chrome,
    discovery,
  ] = await Promise.all([
    websiteHomepageRepository.get(),

    resolvePublicChrome(
      "HOMEPAGE",
    ),

    resolveDiscovery(),
  ]);

  return {
    ...homepagePresentation(
      setting.config,
    ),

    chrome,
    discovery,
  };
}