"use client";

export interface Transaction {
  id: string;
  date: string;
  details: string;
  type:
    | "Income"
    | "Expense"
    | "Vendor Payment"
    | "Driver Salary"
    | "Refund"
    | "Commission";
  paymentMethod: string;
  amount: number;
  status: "Completed" | "Pending" | "Failed";
}

interface TransactionRowProps {
  transaction: Transaction;
  onView: (transaction: Transaction) => void;
}

const typeStyle: Record<Transaction["type"], string> = {
  Income: "bg-green-100 text-green-700",
  Expense: "bg-red-100 text-red-700",
  "Vendor Payment": "bg-blue-100 text-blue-700",
  "Driver Salary": "bg-purple-100 text-purple-700",
  Refund: "bg-orange-100 text-orange-700",
  Commission: "bg-indigo-100 text-indigo-700",
};

const statusStyle: Record<Transaction["status"], string> = {
  Completed: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Failed: "bg-red-100 text-red-700",
};

export default function TransactionRow({
  transaction,
  onView,
}: TransactionRowProps) {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-6 py-4 font-mono text-sm text-slate-600">
        {transaction.id}
      </td>

      <td className="px-6 py-4 text-sm text-slate-600">
        {transaction.date}
      </td>

      <td className="px-6 py-4 font-medium text-slate-900">
        {transaction.details}
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            typeStyle[transaction.type]
          }`}
        >
          {transaction.type}
        </span>
      </td>

      <td className="px-6 py-4 text-sm text-slate-600">
        {transaction.paymentMethod}
      </td>

      <td className="px-6 py-4 font-bold text-slate-900">
        ₹{transaction.amount.toLocaleString("en-IN")}
      </td>

      <td className="px-6 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusStyle[transaction.status]
          }`}
        >
          {transaction.status}
        </span>
      </td>

      <td className="px-6 py-4">
        <button
          type="button"
          onClick={() => onView(transaction)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          View
        </button>
      </td>
    </tr>
  );
}