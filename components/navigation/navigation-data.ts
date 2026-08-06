import { NavigationGroup } from "./navigation-types";
import { NavigationIcons } from "./navigation-icons";

export const navigation: NavigationGroup[] = [
  // ==========================
  // Dashboard
  // ==========================
  {
    title: "Dashboard",
    defaultOpen: true,
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: NavigationIcons.dashboard,
      },
    ],
  },

  // ==========================
  // Operations
  // ==========================
  {
    title: "Operations",
    defaultOpen: true,
    items: [
      {
        title: "Bookings",
        href: "/bookings",
        icon: NavigationIcons.bookings,
        children: [
          { title: "All Bookings", href: "/bookings" },
          { title: "New Booking", badge: "Soon", disabled: true },
          { title: "Trip Monitor", badge: "Soon", disabled: true },
          { title: "Booking Calendar", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Customers",
        href: "/customers",
        icon: NavigationIcons.customers,
        children: [
          { title: "Customer List", href: "/customers" },
          { title: "Customer Wallet", badge: "Soon", disabled: true },
          { title: "Reviews", badge: "Soon", disabled: true },
          { title: "Loyalty", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Drivers",
        href: "/drivers",
        icon: NavigationIcons.drivers,
        children: [
          { title: "Driver List", href: "/drivers" },
          { title: "Driver Documents", badge: "Soon", disabled: true },
          { title: "Attendance", badge: "Soon", disabled: true },
          { title: "Performance", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Vehicles",
        href: "/vehicles",
        icon: NavigationIcons.vehicles,
        children: [
          { title: "Vehicle List", href: "/vehicles" },
          { title: "Maintenance", badge: "Soon", disabled: true },
          { title: "Insurance", badge: "Soon", disabled: true },
          { title: "GPS Tracking", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Vendors",
        href: "/vendors",
        icon: NavigationIcons.vendors,
        children: [
          { title: "Vendor List", href: "/vendors" },
          { title: "Vendor Wallet", badge: "Soon", disabled: true },
          { title: "Vendor Payouts", badge: "Soon", disabled: true },
          { title: "Vendor Performance", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // Corporate
  // ==========================
  {
    title: "Corporate",
    items: [
      {
        title: "Corporate",
        href: "/corporate",
        icon: NavigationIcons.corporate,
        children: [
          { title: "Companies", badge: "Soon", disabled: true },
          { title: "Employees", badge: "Soon", disabled: true },
          { title: "Travel Policy", badge: "Soon", disabled: true },
          { title: "Corporate Wallet", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // Finance
  // ==========================
  {
    title: "Finance",
    items: [
      {
        title: "Finance",
        href: "/finance",
        icon: NavigationIcons.finance,
        children: [
          { title: "Dashboard", href: "/finance" },
          { title: "Transactions", badge: "Soon", disabled: true },
          { title: "Revenue", badge: "Soon", disabled: true },
          { title: "Expenses", badge: "Soon", disabled: true },
          { title: "Wallet", badge: "Soon", disabled: true },
          { title: "Settlements", badge: "Soon", disabled: true },
          { title: "Invoices", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Reports",
        href: "/reports",
        icon: NavigationIcons.reports,
        children: [
          { title: "Financial Reports", href: "/reports" },
          { title: "GST Reports", badge: "Soon", disabled: true },
          { title: "Tax Reports", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // Analytics
  // ==========================
  {
    title: "Analytics",
    items: [
      {
        title: "Analytics",
        href: "/analytics",
        icon: NavigationIcons.analytics,
        children: [
          { title: "Dashboard", href: "/analytics" },
          { title: "Business Insights", badge: "Soon", disabled: true },
          { title: "Fleet Analytics", badge: "Soon", disabled: true },
          { title: "Customer Analytics", badge: "Soon", disabled: true },
          { title: "Revenue Analytics", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // Communication
  // ==========================
  {
    title: "Communication",
    items: [
      {
        title: "Notifications",
        href: "/notifications",
        icon: NavigationIcons.notifications,
        children: [
          { title: "Notification Center", href: "/notifications" },
          { title: "Email", badge: "Soon", disabled: true },
          { title: "SMS", badge: "Soon", disabled: true },
          { title: "WhatsApp", badge: "Soon", disabled: true },
          { title: "Push Notifications", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // AI
  // ==========================
  {
    title: "AI",
    items: [
      {
        title: "AI Center",
        href: "/ai",
        icon: NavigationIcons.ai,
        children: [
          { title: "AI Dashboard", href: "/ai" },
          { title: "Predictions", badge: "Soon", disabled: true },
          { title: "AI Logs", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Automation",
        href: "/automation",
        icon: NavigationIcons.automation,
        children: [
          { title: "Automation Rules", href: "/automation" },
          { title: "Schedulers", badge: "Soon", disabled: true },
          { title: "Workflow Engine", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // Security
  // ==========================
  {
    title: "Security",
    items: [
      {
        title: "Security",
        href: "/security",
        icon: NavigationIcons.security,
        children: [
          { title: "Security Center", href: "/security" },
          { title: "Audit Logs", badge: "Soon", disabled: true },
          { title: "Permissions", badge: "Soon", disabled: true },
          { title: "Sessions", badge: "Soon", disabled: true },
          { title: "Roles", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // CRM
  // ==========================
  {
    title: "CRM",
    items: [
      {
        title: "CRM",
        href: "/crm",
        icon: NavigationIcons.crm,
        children: [
          { title: "Dashboard", badge: "Soon", disabled: true },
          { title: "Leads", badge: "Soon", disabled: true },
          { title: "Opportunities", badge: "Soon", disabled: true },
          { title: "Campaigns", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Support",
        href: "/support",
        icon: NavigationIcons.support,
        children: [
          { title: "Support Tickets", href: "/support" },
          { title: "Knowledge Base", badge: "Soon", disabled: true },
        ],
      },
    ],
  },

  // ==========================
  // Administration
  // ==========================
  {
    title: "Administration",
    items: [
      {
        title: "Pricing",
        href: "/pricing",
        icon: NavigationIcons.pricing,
        children: [
          { title: "Pricing Rules", badge: "Soon", disabled: true },
          { title: "Dynamic Pricing", badge: "Soon", disabled: true },
        ],
      },
      {
        title: "Settings",
        href: "/settings",
        icon: NavigationIcons.settings,
        children: [
          { title: "General", href: "/settings" },
          { title: "Integrations", badge: "Soon", disabled: true },
          { title: "API Keys", badge: "Soon", disabled: true },
          { title: "Platform Settings", badge: "Soon", disabled: true },
          { title: "Promotions", badge: "Soon", disabled: true },
        ],
      },
    ],
  },
];