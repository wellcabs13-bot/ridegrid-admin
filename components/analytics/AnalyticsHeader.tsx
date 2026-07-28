'use client';

interface AnalyticsHeaderProps {
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}

export default function AnalyticsHeader({
  onExportExcel,
  onExportPDF,
}: AnalyticsHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Business Analytics
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Executive business intelligence, performance metrics and company
            insights.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onExportExcel}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Export Excel
          </button>

          <button
            onClick={onExportPDF}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Export PDF
          </button>

          <button className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700">
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}
  