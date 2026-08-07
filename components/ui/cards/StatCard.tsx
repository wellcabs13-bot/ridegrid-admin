"use client";

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendType?: "up" | "down";
  color?: "blue" | "green" | "purple" | "orange" | "red" | "cyan";
}

const colors = {
  blue: "from-blue-600 to-blue-500 shadow-blue-500/25",
  green: "from-emerald-600 to-emerald-500 shadow-emerald-500/25",
  purple: "from-violet-600 to-violet-500 shadow-violet-500/25",
  orange: "from-orange-600 to-orange-500 shadow-orange-500/25",
  red: "from-red-600 to-red-500 shadow-red-500/25",
  cyan: "from-cyan-600 to-cyan-500 shadow-cyan-500/25",
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  trendType = "up",
  color = "blue",
}: StatCardProps) {
  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">

      <div className="flex items-start justify-between">

        <div>

          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <h2 className="mt-3 text-4xl font-bold text-slate-900">
            {value}
          </h2>

          {trend && (
            <div
              className={cn(
                "mt-4 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                trendType === "up"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              )}
            >
              {trendType === "up" ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}

              {trend}
            </div>
          )}

        </div>

        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-xl",
            colors[color]
          )}
        >
          {icon}
        </div>

      </div>

    </div>
  );
}