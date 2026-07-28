'use client';

const commission = [
  {
    source: 'Marketplace Commission',
    amount: '₹4.28L',
    share: 62,
    color: 'bg-indigo-600',
  },
  {
    source: 'Convenience Fee',
    amount: '₹1.34L',
    share: 20,
    color: 'bg-cyan-500',
  },
  {
    source: 'Cancellation Charges',
    amount: '₹58K',
    share: 8,
    color: 'bg-orange-500',
  },
  {
    source: 'Premium Listing',
    amount: '₹64K',
    share: 10,
    color: 'bg-emerald-500',
  },
];

export default function CommissionAnalytics() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Commission Analytics
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Platform earnings breakdown
            </p>
          </div>

          <span className="rounded-xl bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            ₹6.84L
          </span>
        </div>
      </div>

      <div className="space-y-6 p-6">
        {commission.map((item) => (
          <div key={item.source}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">{item.source}</h3>

                <p className="text-sm text-slate-500">
                  {item.share}% Contribution
                </p>
              </div>

              <span className="font-bold text-indigo-600">{item.amount}</span>
            </div>

            <div className="h-3 rounded-full bg-slate-100">
              <div
                className={`${item.color} h-3 rounded-full`}
                style={{
                  width: `${item.share}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
