'use client';

export default function IncomeExpenseChart() {
  const data = [
    { month: 'Jan', income: 280000, expense: 182000 },
    { month: 'Feb', income: 315000, expense: 196000 },
    { month: 'Mar', income: 342000, expense: 214000 },
    { month: 'Apr', income: 388000, expense: 245000 },
    { month: 'May', income: 425000, expense: 271000 },
    { month: 'Jun', income: 462000, expense: 289000 },
    { month: 'Jul', income: 515000, expense: 304000 },
  ];

  const maxValue = Math.max(
    ...data.flatMap((item) => [item.income, item.expense])
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Income vs Expenses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Monthly financial comparison
            </p>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-indigo-600" />
              <span className="text-sm text-slate-600">Income</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-sm text-slate-600">Expense</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex h-80 items-end justify-between gap-5">
          {data.map((item) => {
            const incomeHeight = (item.income / maxValue) * 100;

            const expenseHeight = (item.expense / maxValue) * 100;

            return (
              <div
                key={item.month}
                className="flex flex-1 flex-col items-center"
              >
                <div className="flex h-64 items-end gap-2">
                  <div
                    style={{
                      height: `${incomeHeight}%`,
                    }}
                    className="w-5 rounded-t-lg bg-gradient-to-t from-indigo-700 to-indigo-400 transition-all duration-300 hover:scale-105"
                  />

                  <div
                    style={{
                      height: `${expenseHeight}%`,
                    }}
                    className="w-5 rounded-t-lg bg-gradient-to-t from-red-600 to-orange-400 transition-all duration-300 hover:scale-105"
                  />
                </div>

                <span className="mt-4 text-sm font-semibold text-slate-600">
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200">
        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Total Income</p>

          <h3 className="mt-2 text-xl font-bold text-indigo-600">₹27.27L</h3>
        </div>

        <div className="border-x border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Total Expense</p>

          <h3 className="mt-2 text-xl font-bold text-red-600">₹17.01L</h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Net Profit</p>

          <h3 className="mt-2 text-xl font-bold text-green-600">₹10.26L</h3>
        </div>
      </div>
    </div>
  );
}
