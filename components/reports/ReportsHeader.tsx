'use client';

interface ReportsHeaderProps {
  onExportPDF?: () => void;
  onExportExcel?: () => void;
}

export default function ReportsHeader({
  onExportPDF,
  onExportExcel,
}: ReportsHeaderProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports Center</h1>

          <p className="mt-2 text-sm text-slate-500">
            Generate, export and schedule business reports across the RideGrid
            platform.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={onExportExcel}
            className="rounded-xl border border-slate-300 px-5 py-3 font-medium transition hover:bg-slate-100"
          >
            Export Excel
          </button>

          <button
            onClick={onExportPDF}
            className="rounded-xl border border-slate-300 px-5 py-3 font-medium transition hover:bg-slate-100"
          >
            Export PDF
          </button>

          <button className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700">
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
