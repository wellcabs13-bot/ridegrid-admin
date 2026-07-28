'use client';

export default function WalletCard() {
  const walletBalance = 325640;
  const totalCredits = 1865200;
  const totalDebits = 1539560;
  const available = 278940;
  const hold = 46700;

  const transactions = [
    {
      title: 'Customer Payment',
      amount: '+₹18,500',
      time: 'Today • 10:42 AM',
      type: 'credit',
    },
    {
      title: 'Vendor Settlement',
      amount: '-₹12,800',
      time: 'Today • 09:18 AM',
      type: 'debit',
    },
    {
      title: 'Driver Salary',
      amount: '-₹24,500',
      time: 'Yesterday',
      type: 'debit',
    },
    {
      title: 'Online Booking',
      amount: '+₹35,200',
      time: 'Yesterday',
      type: 'credit',
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="rounded-t-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-6 text-white">
        <p className="text-sm opacity-80">RideGrid Business Wallet</p>

        <h2 className="mt-3 text-4xl font-bold">
          ₹{walletBalance.toLocaleString()}
        </h2>

        <p className="mt-2 text-sm opacity-80">Current Available Balance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 p-6">
        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Total Credits</p>

          <h3 className="mt-2 text-2xl font-bold text-green-600">
            ₹{totalCredits.toLocaleString()}
          </h3>
        </div>

        <div className="rounded-xl bg-red-50 p-5">
          <p className="text-sm text-slate-500">Total Debits</p>

          <h3 className="mt-2 text-2xl font-bold text-red-600">
            ₹{totalDebits.toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="px-6">
        <div className="rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <span className="font-semibold text-slate-800">Wallet Summary</span>

            <span className="text-sm text-slate-500">Live Balance</span>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Available Balance</span>

              <span className="font-bold text-green-600">
                ₹{available.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Amount on Hold</span>

              <span className="font-bold text-orange-600">
                ₹{hold.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200">
        <div className="flex items-center justify-between px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900">
            Recent Wallet Activity
          </h3>

          <button className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            View All
          </button>
        </div>

        <div className="space-y-1">
          {transactions.map((transaction) => (
            <div
              key={`${transaction.title}-${transaction.time}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-slate-50"
            >
              <div>
                <h4 className="font-semibold text-slate-900">
                  {transaction.title}
                </h4>

                <p className="text-sm text-slate-500">{transaction.time}</p>
              </div>

              <span
                className={`text-lg font-bold ${
                  transaction.type === 'credit'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {transaction.amount}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 p-6">
        <button className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition hover:bg-indigo-700">
          Open Wallet Ledger
        </button>
      </div>
    </div>
  );
}
