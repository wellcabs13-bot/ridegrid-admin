import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Car,
  CarFront,
  Building2,
  Wallet,
  BarChart3,
  FileText,
  Bell,
  Headset,
  Settings,
  ShieldCheck,
  Building,
  Briefcase,
  Brain,
} from "lucide-react";

import { Permission } from "@/lib/permissions";

export interface NavigationChild {
  title: string;
  href: string;
  permission: Permission;
}

export interface NavigationItem {
  title: string;
  icon: any;
  href?: string;
  permission?: Permission;
  children?: NavigationChild[];
}

export const navigation: NavigationItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
    permission: Permission.DASHBOARD_VIEW,
  },

  {
    title: "Bookings",
    icon: CalendarDays,
    children: [
      {
        title: "All Bookings",
        href: "/bookings",
        permission: Permission.BOOKING_VIEW,
      },
      {
        title: "New Booking",
        href: "/bookings/new",
        permission: Permission.BOOKING_CREATE,
      },
    ],
  },

  {
    title: "Customers",
    icon: Users,
    children: [
      {
        title: "All Customers",
        href: "/customers",
        permission: Permission.CUSTOMER_VIEW,
      },
      {
        title: "Add Customer",
        href: "/customers/new",
        permission: Permission.CUSTOMER_MANAGE,
      },
    ],
  },

  {
    title: "Drivers",
    icon: CarFront,
    children: [
      {
        title: "All Drivers",
        href: "/drivers",
        permission: Permission.DRIVER_VIEW,
      },
      {
        title: "Add Driver",
        href: "/drivers/new",
        permission: Permission.DRIVER_MANAGE,
      },
    ],
  },

  {
    title: "Vehicles",
    icon: Car,
    children: [
      {
        title: "All Vehicles",
        href: "/vehicles",
        permission: Permission.VEHICLE_VIEW,
      },
      {
        title: "Add Vehicle",
        href: "/vehicles/new",
        permission: Permission.VEHICLE_MANAGE,
      },
    ],
  },

  {
    title: "Vendors",
    icon: Building2,
    href: "/vendors",
    permission: Permission.VENDOR_VIEW,
  },

  {
    title: "Corporate",
    icon: Building,
    href: "/corporate",
    permission: Permission.DASHBOARD_VIEW,
  },

  {
    title: "CRM",
    icon: Briefcase,
    href: "/crm",
    permission: Permission.DASHBOARD_VIEW,
  },

  {
    title: "Finance",
    icon: Wallet,
    href: "/finance",
    permission: Permission.FINANCE_VIEW,
  },

  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    permission: Permission.REPORT_VIEW,
  },

  {
    title: "Reports",
    icon: FileText,
    href: "/reports",
    permission: Permission.REPORT_VIEW,
  },

  {
    title: "Notifications",
    icon: Bell,
    href: "/notifications",
    permission: Permission.DASHBOARD_VIEW,
  },

  {
    title: "AI Center",
    icon: Brain,
    href: "/ai",
    permission: Permission.DASHBOARD_VIEW,
  },

  {
    title: "Support",
    icon: Headset,
    href: "/support",
    permission: Permission.DASHBOARD_VIEW,
  },

  {
    title: "Security",
    icon: ShieldCheck,
    href: "/security",
    permission: Permission.SETTINGS_MANAGE,
  },

  {
    title: "Settings",
    icon: Settings,
    href: "/settings",
    permission: Permission.SETTINGS_MANAGE,
  },
];