'use client';

export interface IncomeExpensePoint {
  month: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: IncomeExpensePoint[];
}

export default function IncomeExpenseChart({
  data,
}: IncomeExpenseChartProps) {
  const maxValue = Math.max(
    ...data.flatMap((item) => [item.income, item.expense]),
    1
  );

  const totalIncome = data.reduce((sum, item) => sum + item.income, 0);
  const totalExpense = data.reduce((sum, item) => sum + item.expense, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Income vs Expenses
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Recorded monthly financial comparison
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
        {data.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            No financial data available.
          </div>
        ) : (
          <div className="flex h-80 items-end justify-between gap-5">
            {data.map((item) => (
              <div
                key={item.month}
                className="flex flex-1 flex-col items-center"
              >
                <div className="flex h-64 items-end gap-2">
                  <div
                    style={{
                      height: `${(item.income / maxValue) * 100}%`,
                    }}
                    className="w-5 rounded-t-lg bg-gradient-to-t from-indigo-700 to-indigo-400"
                  />

                  <div
                    style={{
                      height: `${(item.expense / maxValue) * 100}%`,
                    }}
                    className="w-5 rounded-t-lg bg-gradient-to-t from-red-600 to-orange-400"
                  />
                </div>

                <span className="mt-4 text-sm font-semibold text-slate-600">
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-slate-200">
        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Total Income</p>
          <h3 className="mt-2 text-xl font-bold text-indigo-600">
            ₹{totalIncome.toLocaleString('en-IN')}
          </h3>
        </div>

        <div className="border-x border-slate-200 p-5 text-center">
          <p className="text-sm text-slate-500">Total Expense</p>
          <h3 className="mt-2 text-xl font-bold text-red-600">
            ₹{totalExpense.toLocaleString('en-IN')}
          </h3>
        </div>

        <div className="p-5 text-center">
          <p className="text-sm text-slate-500">Net Profit</p>
          <h3 className="mt-2 text-xl font-bold text-green-600">
            ₹{netProfit.toLocaleString('en-IN')}
          </h3>
        </div>
      </div>
    </div>
  );
}