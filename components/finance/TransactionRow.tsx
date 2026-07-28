'use client';

export interface Transaction {
  id: string;
  date: string;
  title: string;
  category: string;
  type: string;
  paymentMethod: string;
  amount: number;
  status: string;
}

interface TransactionRowProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
}

export default function TransactionRow({
  transaction,
  onView,
}: TransactionRowProps) {
  const typeStyle = {
    Income: 'bg-green-100 text-green-700',
    Expense: 'bg-red-100 text-red-700',
    'Vendor Payment': 'bg-blue-100 text-blue-700',
    'Driver Salary': 'bg-purple-100 text-purple-700',
    Refund: 'bg-orange-100 text-orange-700',
    Commission: 'bg-indigo-100 text-indigo-700',
  };

  const statusStyle = {
    Completed: 'bg-green-100 text-green-700',
    Pending: 'bg-yellow-100 text-yellow-700',
    Failed: 'bg-red-100 text-red-700',
  };

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50">
      <td className="px-6 py-4 font-semibold text-slate-900">
        {transaction.id}
      </td>

      <td className="px-6 py-4 text-slate-600">{transaction.date}</td>

      <td className="px-6 py-4">
        <div className="font-semibold text-slate-900">{transaction.title}</div>

        <div className="text-sm text-slate-500">{transaction.category}</div>
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            typeStyle[transaction.type as keyof typeof typeStyle] ||
            'bg-slate-100 text-slate-700'
          }`}
        >
          {transaction.type}
        </span>
      </td>

      <td className="px-6 py-4 text-slate-700">{transaction.paymentMethod}</td>

      <td className="px-6 py-4 font-bold text-slate-900">
        ₹{transaction.amount.toLocaleString()}
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusStyle[transaction.status as keyof typeof statusStyle] ||
            'bg-slate-100 text-slate-700'
          }`}
        >
          {transaction.status}
        </span>
      </td>

      <td className="px-6 py-4">
        <button
          onClick={() => onView(transaction)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          View
        </button>
      </td>
    </tr>
  );
}
