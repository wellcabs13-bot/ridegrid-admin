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
      title: 'Total Bookings',
      value: total,
      icon: '📅',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Running Trips',
      value: running,
      icon: '🚖',
      color: 'bg-orange-100 text-orange-700',
    },
    {
      title: 'Completed Trips',
      value: completed,
      icon: '✅',
      color: 'bg-green-100 text-green-700',
    },
    {
      title: 'Revenue',
      value: `₹${revenue.toLocaleString('en-IN')}`,
      icon: '💰',
      color: 'bg-purple-100 text-purple-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">{stat.title}</p>

              <h2 className="text-3xl font-bold text-slate-800 mt-2">
                {stat.value}
              </h2>
            </div>

            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${stat.color}`}
            >
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
