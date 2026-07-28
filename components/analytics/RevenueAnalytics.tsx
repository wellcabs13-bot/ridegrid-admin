'use client';

const data = [
  { month: 'Jan', revenue: 320000 },
  { month: 'Feb', revenue: 365000 },
  { month: 'Mar', revenue: 402000 },
  { month: 'Apr', revenue: 428000 },
  { month: 'May', revenue: 452000 },
  { month: 'Jun', revenue: 488000 },
  { month: 'Jul', revenue: 536000 },
];

export default function RevenueAnalytics() {
  const max = Math.max(...data.map((i) => i.revenue));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Revenue Analytics
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monthly revenue performance
            </p>
          </div>

          <div className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            +18.4%
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex h-80 items-end justify-between gap-5">
          {data.map((item) => (
            <div key={item.month} className="flex flex-1 flex-col items-center">
              <div
                style={{
                  height: `${(item.revenue / max) * 100}%`,
                }}
                className="w-full max-w-[34px] rounded-t-xl bg-gradient-to-t from-indigo-700 via-indigo-500 to-cyan-400 transition-all duration-300 hover:scale-105"
              />

              <span className="mt-4 text-sm font-semibold text-slate-600">
                {item.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200">
        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Highest</p>

          <h3 className="mt-2 text-xl font-bold text-green-600">₹5.36L</h3>
        </div>

        <div className="border-x border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Average</p>

          <h3 className="mt-2 text-xl font-bold text-indigo-600">₹4.27L</h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Growth</p>

          <h3 className="mt-2 text-xl font-bold text-green-600">+18.4%</h3>
        </div>
      </div>
    </div>
  );
}
