"use client";

import {
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  CarFront,
  Bell,
  CircleAlert,
  CheckCircle2,
} from "lucide-react";

const alerts = [
  {
    title: "Vehicle Insurance Expiry",
    subtitle: "6 Vehicles • Next 7 Days",
    color: "red",
    icon: ShieldAlert,
  },
  {
    title: "Pending Vendor Payments",
    subtitle: "₹72,400 Outstanding",
    color: "orange",
    icon: CreditCard,
  },
  {
    title: "Vehicle Maintenance Due",
    subtitle: "12 Vehicles",
    color: "blue",
    icon: CarFront,
  },
  {
    title: "SOS Alerts",
    subtitle: "No Active Alerts",
    color: "green",
    icon: CheckCircle2,
  },
  {
    title: "Customer Complaints",
    subtitle: "3 Open Tickets",
    color: "purple",
    icon: Bell,
  },
];

const colorClasses = {
  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    badge: "bg-red-100 text-red-700",
  },
  orange: {
    bg: "bg-orange-50",
    icon: "text-orange-600",
    badge: "bg-orange-100 text-orange-700",
  },
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
  },
  green: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
  },
  purple: {
    bg: "bg-violet-50",
    icon: "text-violet-600",
    badge: "bg-violet-100 text-violet-700",
  },
};

export default function AlertCenter() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-8 flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-slate-900">
            Enterprise Alert Center
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Critical business notifications
          </p>

        </div>

        <div className="rounded-full bg-red-100 px-4 py-2">

          <span className="text-sm font-semibold text-red-700">
            5 Alerts
          </span>

        </div>

      </div>

      <div className="space-y-4">

        {alerts.map((alert) => {

          const Icon = alert.icon;
          const style =
            colorClasses[alert.color as keyof typeof colorClasses];

          return (

            <div
              key={alert.title}
              className="flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition-all hover:border-blue-200 hover:shadow-md"
            >

              <div className="flex items-center gap-4">

                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${style.bg}`}
                >

                  <Icon
                    className={style.icon}
                    size={22}
                  />

                </div>

                <div>

                  <h3 className="font-semibold text-slate-900">
                    {alert.title}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {alert.subtitle}
                  </p>

                </div>

              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${style.badge}`}
              >
                Active
              </span>

            </div>

          );

        })}

      </div>

      <div className="mt-8 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 p-5 text-white">

        <div className="flex items-start gap-4">

          <CircleAlert size={28} />

          <div>

            <h3 className="font-bold">
              AI Priority Recommendation
            </h3>

            <p className="mt-2 text-sm leading-6">

              Complete vehicle insurance renewals before
              this weekend to avoid service interruptions.
              Vendor payments should also be cleared within
              the next 24 hours.

            </p>

          </div>

        </div>

      </div>

    </div>
  );
}