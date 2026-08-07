"use client";

import {
  CalendarPlus,
  Car,
  UserPlus,
  Building2,
  Receipt,
  Users,
  BarChart3,
  Settings,
  ArrowRight,
} from "lucide-react";

const commands = [
  {
    title: "New Booking",
    subtitle: "Create booking",
    icon: CalendarPlus,
    color: "from-blue-500 to-indigo-600",
  },
  {
    title: "Add Vehicle",
    subtitle: "Register fleet",
    icon: Car,
    color: "from-emerald-500 to-green-600",
  },
  {
    title: "Add Driver",
    subtitle: "Register driver",
    icon: UserPlus,
    color: "from-violet-500 to-purple-600",
  },
  {
    title: "Corporate",
    subtitle: "New account",
    icon: Building2,
    color: "from-cyan-500 to-blue-600",
  },
  {
    title: "Invoice",
    subtitle: "Generate bill",
    icon: Receipt,
    color: "from-orange-500 to-red-500",
  },
  {
    title: "Vendor",
    subtitle: "Add partner",
    icon: Users,
    color: "from-pink-500 to-rose-600",
  },
  {
    title: "Reports",
    subtitle: "Analytics",
    icon: BarChart3,
    color: "from-amber-500 to-orange-600",
  },
  {
    title: "Settings",
    subtitle: "Platform",
    icon: Settings,
    color: "from-slate-600 to-slate-800",
  },
];

export default function QuickCommand() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-8">

        <h2 className="text-xl font-bold text-slate-900">
          Quick Command Center
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Frequently used enterprise actions
        </p>

      </div>

      <div className="grid grid-cols-2 gap-4">

        {commands.map((command) => {

          const Icon = command.icon;

          return (

            <button
              key={command.title}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
            >

              <div
                className={`bg-gradient-to-r ${command.color} p-5 text-white`}
              >

                <div className="flex items-center justify-between">

                  <Icon size={28} />

                  <ArrowRight
                    size={18}
                    className="transition group-hover:translate-x-1"
                  />

                </div>

              </div>

              <div className="p-5 text-left">

                <h3 className="font-bold text-slate-900">
                  {command.title}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {command.subtitle}
                </p>

              </div>

            </button>

          );

        })}

      </div>

      <div className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 p-6 text-white">

        <h3 className="text-lg font-bold">
          AI Productivity Tip
        </h3>

        <p className="mt-3 text-sm leading-6 opacity-90">

          Use Quick Commands to reduce booking creation
          time by up to <strong>65%</strong>. Frequently
          used actions are automatically prioritized
          based on your daily workflow.

        </p>

      </div>

    </div>
  );
}