import { NavigationGroup } from "./navigation-types";
import { NavigationIcons } from "./navigation-icons";

export const navigation: NavigationGroup[] = [
  {
    title: "Dashboard",
    defaultOpen: true,
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: NavigationIcons.dashboard,
      },
    ],
  },
  {
    title: "Operations",
    defaultOpen: true,
    items: [
      {
        title: "Bookings",
        href: "/bookings",
        icon: NavigationIcons.bookings,
        children: [
          { title: "New Booking", href: "/marketplace/booking" },
        ],
      },
      {
        title: "Customers",
        href: "/customers",
        icon: NavigationIcons.customers,
      },
      {
        title: "Drivers",
        href: "/drivers",
        icon: NavigationIcons.drivers,
      },
      {
        title: "Vehicles",
        href: "/vehicles",
        icon: NavigationIcons.vehicles,
      },
      {
        title: "Vendors",
        href: "/vendors",
        icon: NavigationIcons.vendors,
      },
    ],
  },
  {
    title: "Corporate",
    items: [
      {
        title: "Corporate",
        href: "/corporate",
        icon: NavigationIcons.corporate,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "Finance",
        href: "/finance",
        icon: NavigationIcons.finance,
      },
      {
        title: "Reports",
        href: "/reports",
        icon: NavigationIcons.reports,
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        title: "Analytics",
        href: "/analytics",
        icon: NavigationIcons.analytics,
      },
    ],
  },
  {
    title: "Communication",
    items: [
      {
        title: "Notifications",
        href: "/notifications",
        icon: NavigationIcons.notifications,
      },
    ],
  },
  {
    title: "AI",
    items: [
      {
        title: "AI Center",
        href: "/ai",
        icon: NavigationIcons.ai,
      },
      {
        title: "Automation",
        href: "/automation",
        icon: NavigationIcons.automation,
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        title: "Security",
        href: "/security",
        icon: NavigationIcons.security,
      },
    ],
  },
  {
    title: "CRM",
    items: [
      {
        title: "CRM",
        href: "/crm",
        icon: NavigationIcons.crm,
      },
      {
        title: "Support",
        href: "/support",
        icon: NavigationIcons.support,
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Pricing",
        href: "/pricing",
        icon: NavigationIcons.pricing,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: NavigationIcons.settings,
      },
    ],
  },
];
