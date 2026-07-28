'use client';

const stats = [
  {
    title: 'Total Revenue',
    value: '₹48.76L',
    growth: '+18.4%',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    title: 'Bookings',
    value: '14,286',
    growth: '+12.8%',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    title: 'Customers',
    value: '8,462',
    growth: '+9.7%',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    title: 'Active Vendors',
    value: '284',
    growth: '+6.3%',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    title: 'Active Drivers',
    value: '612',
    growth: '+14.1%',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Fleet Utilization',
    value: '91%',
    growth: '+3.4%',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    title: 'Commission',
    value: '₹6.84L',
    growth: '+16.2%',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Net Growth',
    value: '+24.5%',
    growth: 'Excellent',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
  },
];

export default function AnalyticsStats() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className={`inline-flex rounded-xl ${item.bg} px-3 py-2`}>
            <span className={`text-sm font-bold ${item.color}`}>
              {item.growth}
            </span>
          </div>

          <h2 className="mt-5 text-3xl font-bold text-slate-900">
            {item.value}
          </h2>

          <p className="mt-2 text-sm text-slate-500">{item.title}</p>
        </div>
      ))}
    </div>
  );
}
