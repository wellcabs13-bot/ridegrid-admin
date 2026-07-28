'use client';

export default function VendorPaymentCard() {
  const totalPaid = 1846000;
  const pending = 124300;
  const vendors = 118;

  const payments = [
    {
      vendor: 'Sai Travels',
      amount: 28500,
      status: 'Completed',
    },
    {
      vendor: 'Shiv Cabs',
      amount: 18200,
      status: 'Pending',
    },
    {
      vendor: 'Royal Tours',
      amount: 41200,
      status: 'Completed',
    },
    {
      vendor: 'Prime Wheels',
      amount: 12600,
      status: 'Pending',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Vendor Payments
            </h2>

            <p className="mt-1 text-sm text-slate-500">Settlement overview</p>
          </div>

          <div className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700">
            {vendors} Vendors
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Total Paid</p>

          <h3 className="mt-2 text-2xl font-bold text-green-600">
            ₹{totalPaid.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-red-50 p-5">
          <p className="text-sm text-slate-500">Pending</p>

          <h3 className="mt-2 text-2xl font-bold text-red-600">
            ₹{pending.toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {payments.map((payment) => (
          <div
            key={payment.vendor}
            className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
          >
            <div>
              <h4 className="font-semibold text-slate-900">{payment.vendor}</h4>

              <p className="text-sm text-slate-500">Vendor Settlement</p>
            </div>

            <div className="text-right">
              <h4 className="font-bold text-slate-900">
                ₹{payment.amount.toLocaleString()}
              </h4>

              <span
                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  payment.status === 'Completed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {payment.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-5">
        <button className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700">
          View All Vendor Payments
        </button>
      </div>
    </div>
  );
}
