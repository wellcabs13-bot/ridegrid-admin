import {
  CalendarDays,
  CarFront,
  CircleCheckBig,
  Wallet,
  TrendingUp,
} from "lucide-react";

interface BookingStatsProps {
  total: number;
  running: number;
  completed: number;
  revenue: number;
}

export default function BookingStats({
  total,
  running,
  completed,
  revenue,
}: BookingStatsProps) {
  const stats = [
    {
      title: "Total Bookings",
      value: total.toLocaleString(),
      change: "+12%",
      icon: CalendarDays,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      badge: "bg-blue-100 text-blue-700",
    },
    {
      title: "Running Trips",
      value: running.toLocaleString(),
      change: "+5%",
      icon: CarFront,
      bg: "bg-orange-50",
      iconColor: "text-orange-600",
      badge: "bg-orange-100 text-orange-700",
    },
    {
      title: "Completed Trips",
      value: completed.toLocaleString(),
      change: "+18%",
      icon: CircleCheckBig,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "Revenue",
      value: `₹${revenue.toLocaleString("en-IN")}`,
      change: "+21%",
      icon: Wallet,
      bg: "bg-violet-50",
      iconColor: "text-violet-600",
      badge: "bg-violet-100 text-violet-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-slate-100 opacity-40 blur-2xl transition-all group-hover:scale-150" />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.title}
                </p>

                <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
                  {stat.value}
                </h2>

                <div
                  className={`mt-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${stat.badge}`}
                >
                  <TrendingUp size={15} />

                  {stat.change}
                </div>
              </div>

              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl ${stat.bg}`}
              >
                <Icon
                  size={30}
                  className={stat.iconColor}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}