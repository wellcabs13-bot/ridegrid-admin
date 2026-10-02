import type {
  WebsitePublicNavigationItem,
} from "../website-seo/public-navigation/types";

import type {
  PublicLink,
  PublicNavLink,
} from "./types";

import {
  publicHref,
} from "./safety";

// Dropdown entries shown under a header item with the same label. Every href is a
// real public page or homepage section; no Super Admin or internal path appears here.
export const PUBLIC_MENU: Record<string, PublicLink[]> = {
  Outstation: [
    { label: "One Way", href: "/services/one-way-cab/pune" },
    { label: "Round Trip", href: "/services/round-trip-cab/pune" },
    { label: "Popular Routes", href: "/#popular-routes" },
    { label: "Tours", href: "/marketplace?trip=tours" },
  ],
  "Local Cabs": [
    { label: "Local Cabs", href: "/services/local-car-rental/pune" },
    { label: "8H / 80KM", href: "/marketplace?trip=local" },
    { label: "12H / 120KM", href: "/marketplace?trip=local12" },
  ],
  "Airport Transfers": [
    { label: "Airport Pickup", href: "/marketplace?trip=airport-pickup" },
    { label: "Airport Drop", href: "/marketplace?trip=airport-drop" },
    { label: "Pune Airport", href: "/airports/pune-airport" },
    { label: "Mumbai Airport", href: "/airports/chhatrapati-shivaji-maharaj-international-airport" },
  ],
  Corporate: [
    { label: "Corporate Car Rental", href: "/corporate-travel" },
    { label: "Employee Transportation", href: "/corporate-travel#employee-transport" },
    { label: "Corporate Login", href: "/corporate-login" },
    { label: "Corporate Enquiry", href: "/corporate-travel#enquiry" },
  ],
  "Travel Guides": [
    { label: "Pune", href: "/cities/pune" },
    { label: "Mumbai", href: "/cities/mumbai" },
    { label: "Nashik", href: "/cities/nashik" },
    { label: "Kolhapur", href: "/cities/kolhapur" },
    { label: "Pune to Mumbai", href: "/routes/pune-to-mumbai-cab" },
  ],
  About: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Support", href: "/contact#support" },
    { label: "Privacy", href: "/privacy-policy" },
    { label: "Terms", href: "/terms-and-conditions" },
    { label: "Account Deletion", href: "/account-deletion" },
  ],
};

// Footer columns when the Website & SEO dashboard has not configured footer links.
export const FOOTER_COLUMNS: { title: string; links: PublicLink[] }[] = [
  { title: "Services", links: [
    { label: "Outstation Cabs", href: "/services/one-way-cab/pune" },
    { label: "Round Trip Cabs", href: "/services/round-trip-cab/pune" },
    { label: "Local Cab Service", href: "/services/local-car-rental/pune" },
    { label: "Airport Transfers", href: "/airports/pune-airport" },
    { label: "Corporate Car Rental", href: "/corporate-travel" },
  ] },
  { title: "Popular Routes", links: [
    { label: "Pune to Mumbai", href: "/routes/pune-to-mumbai-cab" },
    { label: "Mumbai to Pune", href: "/routes/mumbai-to-pune-cab" },
    { label: "Pune to Nashik", href: "/routes/pune-to-nashik-cab" },
    { label: "Pune to Kolhapur", href: "/routes/pune-to-kolhapur-cab" },
    { label: "Pune to Satara", href: "/routes/pune-to-satara-cab" },
  ] },
  { title: "Corporate", links: [
    { label: "Corporate Travel", href: "/corporate-travel" },
    { label: "Employee Transportation", href: "/corporate-travel#employee-transport" },
    { label: "Corporate Enquiry", href: "/corporate-travel#enquiry" },
    { label: "Corporate Login", href: "/corporate-login" },
  ] },
  { title: "Company & Support", links: [
    { label: "About", href: "/about" },
    { label: "Contact & Support", href: "/contact" },
    { label: "Driver Login", href: "/partners#drivers" },
    { label: "Vendor / Partner Login", href: "/partners#vendors" },
  ] },
];

export function publicNavigation(
  items: WebsitePublicNavigationItem[],
  configured: boolean,
): PublicNavLink[] {
  if (!configured) {
    return [
      { label: "Home", href: "/", location: "HEADER" },
      { label: "Outstation", href: "/#outstation", location: "HEADER" },
      { label: "Local Cabs", href: "/#local-cabs", location: "HEADER" },
      { label: "Airport Transfers", href: "/#airport-transfers", location: "HEADER" },
      { label: "Corporate", href: "/corporate-travel", location: "HEADER" },
      { label: "Travel Guides", href: "/#travel-guides", location: "HEADER" },
      { label: "About", href: "/about", location: "HEADER" },
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
