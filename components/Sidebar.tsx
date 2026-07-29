'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  ChevronDown,
  ChevronRight,
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
} from "lucide-react";

type ChildMenu = {
  name: string;
  href: string;
};

type MenuItem = {
  name: string;
  icon: any;
  href?: string;
  children?: ChildMenu[];
};

const menu: MenuItem[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },

  {
    name: "Bookings",
    icon: CalendarDays,
    children: [
      {
        name: "All Bookings",
        href: "/bookings",
      },
      {
        name: "New Booking",
        href: "/bookings/new",
      },
      {
        name: "Running Trips",
        href: "/bookings/running",
      },
      {
        name: "Completed Trips",
        href: "/bookings/completed",
      },
      {
        name: "Cancelled Trips",
        href: "/bookings/cancelled",
      },
    ],
  },

  {
    name: "Customers",
    icon: Users,
    children: [
      {
        name: "All Customers",
        href: "/customers",
      },
      {
        name: "Add Customer",
        href: "/customers/new",
      },
    ],
  },

  {
    name: "Drivers",
    icon: CarFront,
    children: [
      {
        name: "All Drivers",
        href: "/drivers",
      },
      {
        name: "Add Driver",
        href: "/drivers/new",
      },
    ],
  },

  {
    name: "Vehicles",
    icon: Car,
    children: [
      {
        name: "All Vehicles",
        href: "/vehicles",
      },
      {
        name: "Add Vehicle",
        href: "/vehicles/new",
      },
    ],
  },

  {
    name: "Vendors",
    icon: Building2,
    children: [
      {
        name: "All Vendors",
        href: "/vendors",
      },
    ],
  },

  {
    name: "Finance",
    icon: Wallet,
    href: "/finance",
  },

  {
    name: "Analytics",
    icon: BarChart3,
    href: "/analytics",
  },

  {
    name: "Reports",
    icon: FileText,
    href: "/reports",
  },

  {
    name: "Notifications",
    icon: Bell,
    href: "/notifications",
  },

  {
    name: "Support",
    icon: Headset,
    href: "/support",
  },

  {
    name: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [openMenus, setOpenMenus] = useState<string[]>([
    "Bookings",
  ]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name)
        ? prev.filter((m) => m !== name)
        : [...prev, name]
    );
  };  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-200 bg-white">

      {/* Logo */}

      <div className="border-b border-slate-200 p-6">

        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          RideGrid
        </h1>

        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
          Admin Panel
        </p>

      </div>

      {/* Navigation */}

      <div className="flex-1 overflow-y-auto py-4">

        <nav className="space-y-2 px-3">

          {menu.map((item) => {

            const Icon = item.icon;

            if (item.children) {
              const open = openMenus.includes(item.name);

              return (
                <div key={item.name}>

                  <button
                    onClick={() => toggleMenu(item.name)}
                    className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all hover:bg-slate-100"
                  >

                    <div className="flex items-center gap-3">

                      <Icon
                        size={20}
                        className="text-slate-600"
                      />

                      <span className="font-medium text-slate-700">
                        {item.name}
                      </span>

                    </div>

                    {open ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}

                  </button>

                  {open && (
                    <div className="mt-1 ml-6 border-l border-slate-200 pl-4">

                      {item.children.map((child) => {

                        const active =
                          pathname === child.href;

                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`mb-1 block rounded-lg px-3 py-2 text-sm transition-all ${
                              active
                                ? "bg-blue-50 font-semibold text-blue-700"
                                : "text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {child.name}
                          </Link>
                        );
                      })}

                    </div>
                  )}

                </div>
              );
            }

            const active = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href!}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-lg"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >

                <Icon size={20} />

                <span className="font-medium">
                  {item.name}
                </span>

              </Link>
            );

          })}

        </nav>

      </div>

      {/* Footer */}

      <div className="border-t border-slate-200 p-5">

        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">

          <p className="text-sm font-semibold">
            RideGrid Enterprise
          </p>

          <p className="mt-1 text-xs text-blue-100">
            Version 1.0.0
          </p>

        </div>

      </div>

    </aside>
  );
}