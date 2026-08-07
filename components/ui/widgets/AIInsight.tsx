"use client";

import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const insights = [
  {
    icon: TrendingUp,
    color: "text-emerald-600",
    title: "Revenue is expected to grow by 14% today.",
  },
  {
    icon: AlertTriangle,
    color: "text-orange-500",
    title: "5 drivers have not checked in yet.",
  },
  {
    icon: CheckCircle2,
    color: "text-blue-600",
    title: "Fleet utilization is performing above average.",
  },
];

export default function AIInsight() {
  return (
    <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">

      <div className="mb-6 flex items-center gap-3">

        <div className="rounded-xl bg-violet-600 p-3 text-white">
          <Sparkles size={22}/>
        </div>

        <div>

          <h3 className="font-bold text-slate-900">
            RideGrid AI
          </h3>

          <p className="text-sm text-slate-500">
            Business Intelligence
          </p>

        </div>

      </div>

      <div className="space-y-5">

        {insights.map((item) => (
          <div
            key={item.title}
            className="flex gap-3"
          >
            <item.icon
              size={18}
              className={item.color}
            />

            <p className="text-sm text-slate-600">
              {item.title}
            </p>

          </div>
        ))}

      </div>

    </div>
  );
}