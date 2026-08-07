"use client";

import {
  Plane,
  Car,
  Building2,
  Clock3,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

const operations = [
  {
    title: "Airport Pickups",
    value: 64,
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: Plane,
    change: "+8%",
  },
  {
    title: "Airport Drop-offs",
    value: 54,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: Car,
    change: "+5%",
  },
  {
    title: "Corporate Trips",
    value: 27,
    color: "text-violet-600",
    bg: "bg-violet-50",
    icon: Building2,
    change: "+14%",
  },
  {
    title: "Outstation Trips",
    value: 18,
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: Clock3,
    change: "+3%",
  },
];

export default function LiveOperations() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-slate-900">
            Live Operations Center
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Real-time business operations
          </p>

        </div>

        <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2">

          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />

          <span className="text-sm font-semibold text-emerald-700">
            LIVE
          </span>

        </div>

      </div>

      <div className="grid gap-4">

        {operations.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="group flex items-center justify-between rounded-2xl border border-slate-100 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
            >
              <div className="flex items-center gap-4">

                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg}`}
                >
                  <Icon className={item.color} size={24} />
                </div>

                <div>

                  <h3 className="font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-500">
                    Active Today
                  </p>

                </div>

              </div>

              <div className="text-right">

                <div className="text-3xl font-bold text-slate-900">
                  {item.value}
                </div>

                <div className="mt-1 flex items-center justify-end gap-1 text-sm font-semibold text-emerald-600">

                  <TrendingUp size={15} />

                  {item.change}

                </div>

              </div>

            </div>
          );
        })}

      </div>

      <div className="mt-8 rounded-2xl bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 p-5">

        <div className="flex items-start gap-4">

          <div className="rounded-xl bg-red-100 p-3">

            <AlertCircle
              size={22}
              className="text-red-600"
            />

          </div>

          <div>

            <h3 className="font-bold text-slate-900">
              Operational Alert
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Pune Airport demand is increasing rapidly.
              AI recommends allocating 12 additional vehicles
              between <strong>5 PM – 10 PM</strong>.
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}