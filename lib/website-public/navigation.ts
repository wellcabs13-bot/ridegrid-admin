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
        label: "Find a ride",
        href: "/#ride-search",
        location: "HEADER",
      },
      {
        label: "Marketplace",
        href: "/marketplace",
        location: "HEADER",
      },
      {
        label: "Find a ride",
        href: "/#ride-search",
        location: "FOOTER_PRIMARY",
      },
      {
        label: "Marketplace",
        href: "/marketplace",
        location: "FOOTER_PRIMARY",
      },
    ];
  }

  return [...items]
    .filter(
      (item) =>
        item.enabled,
    )
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