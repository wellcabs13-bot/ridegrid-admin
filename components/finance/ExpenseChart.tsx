'use client';

export default function ExpenseChart() {
  const data = [
    { month: 'Jan', expense: 182000 },
    { month: 'Feb', expense: 196000 },
    { month: 'Mar', expense: 214000 },
    { month: 'Apr', expense: 245000 },
    { month: 'May', expense: 271000 },
    { month: 'Jun', expense: 289000 },
    { month: 'Jul', expense: 304000 },
  ];

  const maxValue = Math.max(...data.map((item) => item.expense));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Expense Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monthly operating expenses
            </p>
          </div>

          <div className="rounded-xl bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">
            +6.2%
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex h-72 items-end justify-between gap-4">
          {data.map((item) => {
            const height = (item.expense / maxValue) * 100;

            return (
              <div
                key={item.month}
                className="flex flex-1 flex-col items-center"
              >
                <span className="mb-3 text-xs font-semibold text-slate-600">
                  ₹{(item.expense / 1000).toFixed(0)}K
                </span>

                <div className="flex h-56 w-full items-end">
                  <div
                    style={{
                      height: `${height}%`,
                    }}
                    className="w-full rounded-t-xl bg-gradient-to-t from-red-600 to-orange-400 transition-all duration-500 hover:from-red-700 hover:to-orange-500"
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

          <h3 className="mt-2 text-lg font-bold text-slate-900">₹3.04L</h3>
        </div>

        <div className="border-x border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Average</p>

          <h3 className="mt-2 text-lg font-bold text-slate-900">₹2.43L</h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Increase</p>

          <h3 className="mt-2 text-lg font-bold text-red-600">+6.2%</h3>
        </div>
      </div>
    </div>
  );
}
