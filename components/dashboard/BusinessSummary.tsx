"use client";

import {
  TrendingUp,
  ArrowUpRight,
  Bell,
  Building2,
  Shield,
  Clock3,
} from "lucide-react";

const cards = [
  {
    title: "Monthly Revenue",
    value: "₹3.42 Cr",
    subtitle: "Business Growth",
    icon: TrendingUp,
    iconColor: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    title: "Corporate Clients",
    value: "326",
    subtitle: "Active Companies",
    icon: Building2,
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Pending Alerts",
    value: "18",
    subtitle: "Need Attention",
    icon: Bell,
    iconColor: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "System Health",
    value: "99.98%",
    subtitle: "All Services Online",
    icon: Shield,
    iconColor: "text-cyan-600",
    bg: "bg-cyan-50",
  },
];

export default function BusinessSummary() {
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-4">

      {cards.map((card) => {

        const Icon = card.icon;

        return (

          <div
            key={card.title}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >

            <div className="flex items-center justify-between">

              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.bg}`}
              >

                <Icon
                  size={26}
                  className={card.iconColor}
                />

              </div>

              <ArrowUpRight
                className={card.iconColor}
                size={22}
              />

            </div>

            <h2 className="mt-8 text-3xl font-bold text-slate-900">
              {card.value}
            </h2>

            <p className="mt-2 font-semibold text-slate-700">
              {card.title}
            </p>

            <div className="mt-4 flex items-center gap-2">

              <Clock3
                size={14}
                className="text-slate-400"
              />

              <span className="text-sm text-slate-500">
                {card.subtitle}
              </span>

            </div>

          </div>

        );

      })}

    </div>
  );
}