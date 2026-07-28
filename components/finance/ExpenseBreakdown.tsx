'use client';

export default function ExpenseBreakdown() {
  const expenses = [
    {
      title: 'Vendor Payments',
      amount: 1485000,
      percent: 50,
      color: 'bg-indigo-600',
    },
    {
      title: 'Driver Salaries',
      amount: 628000,
      percent: 21,
      color: 'bg-green-600',
    },
    {
      title: 'Fuel & Toll',
      amount: 327000,
      percent: 11,
      color: 'bg-orange-500',
    },
    {
      title: 'Marketing',
      amount: 186000,
      percent: 6,
      color: 'bg-pink-500',
    },
    {
      title: 'Office Expenses',
      amount: 214000,
      percent: 7,
      color: 'bg-cyan-500',
    },
    {
      title: 'Maintenance',
      amount: 145400,
      percent: 5,
      color: 'bg-red-500',
    },
  ];

  const total = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Expense Breakdown
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Business spending by category
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 px-4 py-2">
            <span className="text-sm font-semibold text-slate-700">
              ₹{total.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {expenses.map((item) => (
          <div key={item.title}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">{item.title}</h4>

                <p className="text-sm text-slate-500">
                  {item.percent}% of total expenses
                </p>
              </div>

              <span className="font-bold text-slate-900">
                ₹{item.amount.toLocaleString()}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${item.color}`}
                style={{
                  width: `${item.percent}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Largest Expense</p>

            <h3 className="mt-2 text-lg font-bold text-slate-900">
              Vendor Payments
            </h3>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Monthly Average</p>

            <h3 className="mt-2 text-lg font-bold text-slate-900">₹4.26L</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
