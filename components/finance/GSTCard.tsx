'use client';

export default function GSTCard() {
  const collected = 286000;
  const paid = 198000;
  const payable = collected - paid;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">GST Summary</h2>

            <p className="mt-1 text-sm text-slate-500">
              Current GST collection and payment status
            </p>
          </div>

          <span className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
            Monthly
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-600">GST Collected</span>

            <span className="font-bold text-green-600">
              ₹{collected.toLocaleString()}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-500"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-600">GST Paid</span>

            <span className="font-bold text-blue-600">
              ₹{paid.toLocaleString()}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{
                width: `${(paid / collected) * 100}%`,
              }}
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-slate-600">GST Payable</span>

            <span className="font-bold text-red-600">
              ₹{payable.toLocaleString()}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-red-500"
              style={{
                width: `${(payable / collected) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 p-6">
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white">
          <p className="text-sm opacity-90">Next GST Filing</p>

          <h2 className="mt-2 text-3xl font-bold">20 Aug 2026</h2>

          <p className="mt-3 text-sm opacity-90">
            Amount Due: ₹{payable.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
