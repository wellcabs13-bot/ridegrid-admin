'use client';

interface FinanceStatsProps {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
  completedTransactions: number;
  refunds: number;
}

const formatINR = (value: number) =>
  `₹${value.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;

export default function FinanceStats({
  totalRevenue,
  totalExpenses,
  netProfit,
  pendingPayments,
  completedTransactions,
  refunds,
}: FinanceStatsProps) {
  const stats = [
    {
      title: 'Total Revenue',
      value: formatINR(totalRevenue),
      change: 'Paid transactions',
      color: 'text-green-600',
    },
    {
      title: 'Total Expenses',
      value: formatINR(totalExpenses),
      change: 'Paid expenses',
      color: 'text-red-600',
    },
    {
      title: 'Net Profit',
      value: formatINR(netProfit),
      change: totalRevenue > 0
        ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% margin`
        : '0% margin',
      color: 'text-indigo-600',
    },
    {
      title: 'Pending Payments',
      value: formatINR(pendingPayments),
      change: 'Vendor settlements',
      color: 'text-orange-600',
    },
    {
      title: 'Completed Transactions',
      value: completedTransactions.toLocaleString('en-IN'),
      change: 'Paid transactions',
      color: 'text-emerald-600',
    },
    {
      title: 'Refunds',
      value: formatINR(refunds),
      change: 'Processed refunds',
      color: 'text-pink-600',
    },
  ];

  return (
    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
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