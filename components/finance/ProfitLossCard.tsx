'use client';

export default function ProfitLossCard() {
  const revenue = 4876500;
  const expenses = 2985400;
  const profit = revenue - expenses;
  const margin = ((profit / revenue) * 100).toFixed(1);

  const items = [
    {
      title: 'Revenue',
      amount: revenue,
      color: 'bg-green-500',
    },
    {
      title: 'Expenses',
      amount: expenses,
      color: 'bg-red-500',
    },
    {
      title: 'Net Profit',
      amount: profit,
      color: 'bg-indigo-600',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Profit & Loss</h2>

            <p className="mt-1 text-sm text-slate-500">
              Current financial performance
            </p>
          </div>

          <div className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            {margin}% Margin
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {items.map((item) => (
          <div key={item.title}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                {item.title}
              </span>

              <span className="font-bold text-slate-900">
                ₹{item.amount.toLocaleString()}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.color}`}
                style={{
                  width: `${(item.amount / revenue) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}

        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
          <p className="text-sm opacity-80">Net Profit</p>

          <h2 className="mt-2 text-4xl font-bold">
            ₹{profit.toLocaleString()}
          </h2>

          <div className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Profit Margin</p>

              <h4 className="mt-1 text-lg font-semibold">{margin}%</h4>
            </div>

            <div>
              <p className="text-xs opacity-80">Growth</p>

              <h4 className="mt-1 text-lg font-semibold">+18.6%</h4>
            </div>

            <div>
              <p className="text-xs opacity-80">Status</p>

              <h4 className="mt-1 text-lg font-semibold">Healthy</h4>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
