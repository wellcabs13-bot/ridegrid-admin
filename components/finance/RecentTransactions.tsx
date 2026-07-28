'use client';

const recentTransactions = [
  {
    id: 'TXN-10251',
    title: 'Mumbai Airport Transfer',
    type: 'Income',
    amount: '₹3,200',
    time: '2 min ago',
    color: 'bg-green-500',
  },
  {
    id: 'TXN-10252',
    title: 'Vendor Settlement',
    type: 'Vendor Payment',
    amount: '₹18,500',
    time: '12 min ago',
    color: 'bg-blue-500',
  },
  {
    id: 'TXN-10253',
    title: 'Driver Salary',
    type: 'Salary',
    amount: '₹25,000',
    time: '35 min ago',
    color: 'bg-purple-500',
  },
  {
    id: 'TXN-10254',
    title: 'Google Ads',
    type: 'Marketing',
    amount: '₹12,000',
    time: '1 hour ago',
    color: 'bg-orange-500',
  },
  {
    id: 'TXN-10255',
    title: 'Booking Refund',
    type: 'Refund',
    amount: '₹2,500',
    time: '3 hours ago',
    color: 'bg-red-500',
  },
  {
    id: 'TXN-10256',
    title: 'Platform Commission',
    type: 'Commission',
    amount: '₹8,450',
    time: '5 hours ago',
    color: 'bg-indigo-500',
  },
];

export default function RecentTransactions() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Recent Transactions
        </h2>

        <p className="mt-1 text-sm text-slate-500">Latest finance activities</p>
      </div>

      <div className="divide-y divide-slate-100">
        {recentTransactions.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-4">
              <div className={`h-3 w-3 rounded-full ${item.color}`} />

              <div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>

                <p className="text-sm text-slate-500">{item.type}</p>
              </div>
            </div>

            <div className="text-right">
              <h4 className="font-bold text-slate-900">{item.amount}</h4>

              <p className="text-xs text-slate-500">{item.time}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-5">
        <button className="w-full rounded-xl border border-slate-300 py-3 font-semibold transition hover:bg-slate-100">
          View All Transactions
        </button>
      </div>
    </div>
  );
}
