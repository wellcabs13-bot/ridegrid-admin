'use client';

interface FinanceHeaderProps {
  onAddExpense: () => void;
}

export default function FinanceHeader({ onAddExpense }: FinanceHeaderProps) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Finance</h1>

        <p className="mt-2 text-slate-500">
          Monitor revenue, expenses, vendor settlements, driver salaries and
          business profitability.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium transition hover:bg-slate-100">
          Export Excel
        </button>

        <button className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium transition hover:bg-slate-100">
          Export PDF
        </button>

        <button
          onClick={onAddExpense}
          className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700"
        >
          + Add Expense
        </button>
      </div>
    </div>
  );
}
