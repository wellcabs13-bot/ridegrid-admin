'use client';

export interface FinanceChartPoint {
  month: string;
  revenue: number;
}

interface RevenueChartProps {
  data: FinanceChartPoint[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
  const maxValue = Math.max(...data.map((item) => item.revenue), 1);
  const total = data.reduce((sum, item) => sum + item.revenue, 0);
  const highest = Math.max(...data.map((item) => item.revenue), 0);
  const average = data.length ? total / data.length : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Revenue Overview
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Revenue from recorded transactions
        </p>
      </div>

      <div className="p-6">
        {data.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            No revenue data available.
          </div>
        ) : (
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
                      style={{ height: `${height}%` }}
                      className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-500"
                    />
                  </div>

                  <span className="mt-4 text-sm font-medium text-slate-600">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200">
        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Highest</p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">
            ₹{highest.toLocaleString('en-IN')}
          </h3>
        </div>

        <div className="border-x border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Average</p>
          <h3 className="mt-2 text-lg font-bold text-slate-900">
            ₹{average.toLocaleString('en-IN', {
              maximumFractionDigits: 0,
            })}
          </h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Total</p>
          <h3 className="mt-2 text-lg font-bold text-green-600">
            ₹{total.toLocaleString('en-IN')}
          </h3>
        </div>
      </div>
    </div>
  );
}