'use client';

export default function FinanceStats() {
  const stats = [
    {
      title: 'Total Revenue',
      value: '₹48,76,500',
      change: '+12.8%',
      color: 'text-green-600',
    },
    {
      title: 'Total Expenses',
      value: '₹29,85,400',
      change: '+6.2%',
      color: 'text-red-600',
    },
    {
      title: 'Net Profit',
      value: '₹18,91,100',
      change: '+18.5%',
      color: 'text-indigo-600',
    },
    {
      title: 'Pending Payments',
      value: '₹1,54,300',
      change: '14 Vendors',
      color: 'text-orange-600',
    },
    {
      title: 'Wallet Balance',
      value: '₹3,82,600',
      change: 'Available',
      color: 'text-blue-600',
    },
    {
      title: 'GST Payable',
      value: '₹88,000',
      change: 'This Month',
      color: 'text-purple-600',
    },
    {
      title: 'Completed Transactions',
      value: '1,248',
      change: '+96 Today',
      color: 'text-emerald-600',
    },
    {
      title: 'Refunds',
      value: '₹42,100',
      change: '18 Requests',
      color: 'text-pink-600',
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
        >
          <p className="text-sm font-medium text-slate-500">{item.title}</p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {item.value}
          </h2>

          <p className={`mt-2 text-sm font-semibold ${item.color}`}>
            {item.change}
          </p>
        </div>
      ))}
    </div>
  );
}
