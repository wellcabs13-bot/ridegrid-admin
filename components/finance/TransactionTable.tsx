'use client';

import TransactionRow, { Transaction } from './TransactionRow';

interface TransactionTableProps {
  transactions: Transaction[];
  onView: (transaction: Transaction) => void;
}

export default function TransactionTable({
  transactions,
  onView,
}: TransactionTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Transactions</h2>

            <p className="mt-1 text-sm text-slate-500">
              Complete finance transaction history
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            {transactions.length} Records
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Transaction ID
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Date
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Details
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Type
              </th>

              <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-600">
                Payment
              </th>

              <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-600">
                Amount
              </th>

              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                Status
              </th>

              <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-600">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  onView={onView}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
        <p className="text-sm text-slate-500">
          Showing <span className="font-semibold">{transactions.length}</span>{' '}
          transactions
        </p>

        <div className="flex gap-2">
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
            Previous
          </button>

          <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            1
          </button>

          <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
