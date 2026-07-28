type DashboardCardProps = {
  title: string;
  value: string | number;
  icon: string;
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
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className={`h-2 ${color}`}></div>

      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>

            <h2 className="text-4xl font-bold mt-2 text-slate-800">{value}</h2>
          </div>

          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-3xl">
            {icon}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-green-600 font-semibold">▲ {change}</span>

          <span className="text-xs text-slate-400">vs yesterday</span>
        </div>
      </div>
    </div>
  );
}
