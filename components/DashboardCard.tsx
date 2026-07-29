import { ReactNode } from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown } from "lucide-react";

type DashboardCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  change: string;
  color: string;
};

export default function DashboardCard({
  title,
  value,
  icon,
  change,
  color,
}: DashboardCardProps) {
  const positive = !change.startsWith("-");

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      <div className={clsx("h-1.5 w-full", color)} />

      <div className="p-6">

        <div className="flex items-start justify-between">

          <div>

            <p className="text-sm font-medium text-slate-500">
              {title}
            </p>

            <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
              {value}
            </h2>

          </div>

          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition-all duration-300 group-hover:scale-110">
            {icon}
          </div>

        </div>

        <div className="mt-8 flex items-center justify-between">

          <div
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
              positive
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            )}
          >
            {positive ? (
              <TrendingUp size={16} />
            ) : (
              <TrendingDown size={16} />
            )}

            {change}
          </div>

          <span className="text-xs uppercase tracking-wider text-slate-400">
            vs Yesterday
          </span>

        </div>

      </div>

    </div>
  );
}