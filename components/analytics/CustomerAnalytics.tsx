'use client';

const customers = [
  {
    title: 'New Customers',
    value: '842',
    change: '+18%',
  },
  {
    title: 'Returning',
    value: '4,382',
    change: '+12%',
  },
  {
    title: 'Repeat Rate',
    value: '67%',
    change: '+6%',
  },
  {
    title: 'Avg Rating',
    value: '4.8',
    change: '+0.2',
  },
];

export default function CustomerAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Customer Analytics</h2>

        <p className="mt-1 text-sm text-slate-500">
          Customer engagement metrics
        </p>
      </div>

      <div className="grid gap-5 p-6">
        {customers.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm text-slate-500">{item.title}</h3>

                <h2 className="mt-2 text-3xl font-bold text-slate-900">
                  {item.value}
                </h2>
              </div>

              <div className="rounded-lg bg-green-100 px-3 py-2 text-sm font-semibold text-green-700">
                {item.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
