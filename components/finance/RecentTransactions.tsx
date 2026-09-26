'use client';

export interface RecentFinanceTransaction {
  id: string;
  title: string;
  type: string;
  amount: number;
  time: string;
}

interface RecentTransactionsProps {
  transactions: RecentFinanceTransaction[];
}

const typeColor = (type: string) => {
  if (type.includes('REFUND')) return 'bg-red-500';
  if (type.includes('PAYOUT')) return 'bg-blue-500';
  if (type.includes('COMMISSION')) return 'bg-indigo-500';
  return 'bg-green-500';
};

export default function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">
          Recent Transactions
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Latest finance activities
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {transactions.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No transactions available.
          </div>
        ) : (
          transactions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-6 py-4 transition hover:bg-slate-50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`h-3 w-3 rounded-full ${typeColor(item.type)}`}
                />

                <div>
                  <h3 className="font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="text-sm text-slate-500">{item.type}</p>
                </div>
              </div>

              <div className="text-right">
                <h4 className="font-bold text-slate-900">
                  ₹{item.amount.toLocaleString('en-IN')}
                </h4>

                <p className="text-xs text-slate-500">{item.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}