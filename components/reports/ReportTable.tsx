'use client';

import { reportTable } from '@/data/reports';

const statusColors: Record<string, string> = {
  Completed: 'bg-green-100 text-green-700',
  Scheduled: 'bg-blue-100 text-blue-700',
  Processing: 'bg-amber-100 text-amber-700',
};

export default function ReportTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Reports Archive</h2>

        <p className="mt-1 text-sm text-slate-500">
          Complete report history and export records
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Report
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Category
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Generated
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Format
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Size
              </th>

              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {reportTable.map((item) => (
              <tr
                key={`${item.report}-${item.generated}`}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-semibold text-slate-900">
                  {item.report}
                </td>

                <td className="px-6 py-4 text-slate-600">{item.category}</td>

                <td className="px-6 py-4 text-slate-600">{item.generated}</td>

                <td className="px-6 py-4 text-slate-600">{item.format}</td>

                <td className="px-6 py-4 text-slate-600">{item.size}</td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusColors[item.status]
                    }`}
                  >
                    {item.status}
                  </span>
                </td>

                <td className="px-6 py-4 text-right">
                  <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100">
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
