"use client";

import { useEffect, useState } from "react";

interface ReportRow {
  report: string;
  category: string;
  value: string;
}

export default function ReportTable() {
  const [rows, setRows] = useState<ReportRow[]>([]);

  useEffect(() => {
    fetch("/api/reports?report=dashboard")
      .then((response) => response.json())
      .then((result) => {
        if (!result.success) return;

        const data = result.data;

        setRows([
          {
            report: "Revenue Report",
            category: "Finance",
            value: `₹${Number(
              data.summary.totalRevenue
            ).toLocaleString("en-IN")}`,
          },
          {
            report: "Expense Report",
            category: "Finance",
            value: `₹${Number(
              data.summary.totalExpenses
            ).toLocaleString("en-IN")}`,
          },
          {
            report: "Booking Report",
            category: "Bookings",
            value: Number(
              data.summary.totalBookings
            ).toLocaleString("en-IN"),
          },
          {
            report: "GST Report",
            category: "Tax",
            value: `₹${Number(
              data.summary.gstCollected
            ).toLocaleString("en-IN")}`,
          },
        ]);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-6">
        <h2 className="text-lg font-bold text-slate-900">
          Reports Archive
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Current generated report summary
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
                Value
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((item) => (
              <tr
                key={item.report}
                className="hover:bg-slate-50"
              >
                <td className="px-6 py-4 font-semibold text-slate-900">
                  {item.report}
                </td>

                <td className="px-6 py-4 text-slate-600">
                  {item.category}
                </td>

                <td className="px-6 py-4 font-semibold text-slate-900">
                  {item.value}
                </td>

                <td className="px-6 py-4 text-right">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    Ready
                  </span>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-10 text-center text-sm text-slate-400"
                >
                  No report data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
