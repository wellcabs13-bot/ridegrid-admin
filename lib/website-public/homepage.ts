import { websiteHomepageRepository } from "../website-seo/homepage/repository";
import type { WebsiteHomepageConfig } from "../website-seo/homepage/types";

import { publicHref } from "./safety";
import { publicNavigation } from "./navigation";
import {
  resolveDiscovery,
  resolvePublicChrome,
} from "./repository";

// Presentation fallback only.
// Dashboard configuration always wins when configured.
const fallback: WebsiteHomepageConfig = {
  version: 1,

  hero: {
    eyebrow: "RIDEGRID Ãƒâ€š /  WELLCABS",
    title:
      "Travel Further With Confidence",
    subtitle:
      "Search current RideGrid options for outstation, local, airport and business travel with Wellcabs.",

    primaryCtaLabel:
      "Find your ride",

    primaryCtaHref:
      "/#ride-search",

    secondaryCtaLabel:
      "Explore vehicles",

    secondaryCtaHref:
      "/marketplace",
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
        "Choose your journey and search current vehicle options.",
    },

    {
      id: "routes",
      type: "ROUTES",
      enabled: true,
      order: 2,
      heading:
        "Fresh journeys from RideGrid.",
      description:
        "Explore published routes, cities and services.",
    },

    {
      id: "marketplace",
      type: "MARKETPLACE",
      enabled: true,
      order: 3,
      heading:
        "Find the right ride for your plans.",
      description:
        "Search your route and travel details to see current marketplace options and fares.",
    },

    {
      id: "cta",
      type: "CTA",
      enabled: true,
      order: 4,
      heading:
        "Ready when you are.",
      description:
        "Search RideGrid for your next journey.",
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
  try {
    const setting =
      await websiteHomepageRepository.get();

    const chrome =
      await resolvePublicChrome(
        "HOMEPAGE",
      );

    const discovery =
      await resolveDiscovery();

    return {
      ...homepagePresentation(
        setting.config,
      ),
      chrome,
      discovery,
    };
  } catch (error) {
    console.error(
      "[website-public] Homepage data unavailable; using safe fallback.",
      error,
    );

    return {
      ...homepagePresentation(null),

      chrome: {
        navigation:
          publicNavigation([], false),
        blocks: [],
        media: [],
      },

      discovery: [],
    };
  }
}