'use client';

export default function RevenueChart() {
  const data = [
    { month: 'Jan', revenue: 280000 },
    { month: 'Feb', revenue: 315000 },
    { month: 'Mar', revenue: 342000 },
    { month: 'Apr', revenue: 388000 },
    { month: 'May', revenue: 425000 },
    { month: 'Jun', revenue: 462000 },
    { month: 'Jul', revenue: 515000 },
  ];

  const maxValue = Math.max(...data.map((item) => item.revenue));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Revenue Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monthly business revenue
            </p>
          </div>

          <div className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            +18.6%
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex h-72 items-end justify-between gap-4">
          {data.map((item) => {
            const height = (item.revenue / maxValue) * 100;

            return (
              <div
                key={item.month}
                className="flex flex-1 flex-col items-center"
              >
                <span className="mb-3 text-xs font-semibold text-slate-600">
                  ₹{(item.revenue / 1000).toFixed(0)}K
                </span>

                <div className="flex h-56 w-full items-end">
                  <div
                    style={{
                      height: `${height}%`,
                    }}
                    className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500 hover:from-indigo-700 hover:to-indigo-500"
                  />
                </div>

                <span className="mt-4 text-sm font-medium text-slate-600">
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200">
        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Highest</p>

          <h3 className="mt-2 text-lg font-bold text-slate-900">₹5.15L</h3>
        </div>

        <div className="border-x border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Average</p>

          <h3 className="mt-2 text-lg font-bold text-slate-900">₹3.90L</h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Growth</p>

          <h3 className="mt-2 text-lg font-bold text-green-600">+18.6%</h3>
        </div>
      </div>
    </div>
  );
}
