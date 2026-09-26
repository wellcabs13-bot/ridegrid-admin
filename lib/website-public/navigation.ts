import type {
  WebsitePublicNavigationItem,
} from "../website-seo/public-navigation/types";

import type {
  PublicNavLink,
} from "./types";

import {
  publicHref,
} from "./safety";

export function publicNavigation(
  items: WebsitePublicNavigationItem[],
  configured: boolean,
): PublicNavLink[] {
  if (!configured) {
    return [
      {
        label: "Home",
        href: "/",
        location: "HEADER",
      },
      {
        label: "Outstation",
        href: "/#outstation",
        location: "HEADER",
      },
      {
        label: "Local Cabs",
        href: "/#local-cabs",
        location: "HEADER",
      },
      {
        label: "Airport Transfers",
        href: "/#airport-transfers",
        location: "HEADER",
      },
      {
        label: "Corporate",
        href: "/#corporate",
        location: "HEADER",
      },
      {
        label: "Travel Guides",
        href: "/#travel-guides",
        location: "HEADER",
      },
      {
        label: "About",
        href: "/#about",
        location: "HEADER",
      },

      {
        label: "Outstation Cabs",
        href: "/#outstation",
        location: "FOOTER_PRIMARY",
      },
      {
        label: "Local Cabs",
        href: "/#local-cabs",
        location: "FOOTER_PRIMARY",
      },
      {
        label: "Airport Transfers",
        href: "/#airport-transfers",
        location: "FOOTER_PRIMARY",
      },
      {
        label: "Corporate Mobility",
        href: "/#corporate",
        location: "FOOTER_PRIMARY",
      },

      {
        label: "Travel Guides",
        href: "/#travel-guides",
        location: "FOOTER_SECONDARY",
      },
      {
        label: "About RideGrid",
        href: "/#about",
        location: "FOOTER_SECONDARY",
      },
      {
        label: "Book a Cab",
        href: "/#ride-search",
        location: "FOOTER_SECONDARY",
      },
    ];
  }

  return [...items]
    .filter((item) => item.enabled)
    .sort(
      (a, b) =>
        a.order - b.order ||
        a.createdAt.localeCompare(
          b.createdAt,
        ),
    )
    .flatMap((item) => {
      const href =
        publicHref(item.href);

      if (
        !href ||
        (
          item.linkType === "INTERNAL"
            ? !href.startsWith("/")
            : !/^https?:\/\//.test(
                href,
              )
        )
      ) {
        return [];
      }

      return [
        {
          label: item.label,
          href,
          location:
            item.location,
          newTab:
            item.openInNewTab,
        },
      ];
    });
}