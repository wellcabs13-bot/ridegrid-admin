"use client";

import { useEffect, useState } from "react";

interface ReportSummary {
  totalRevenue: number;
  totalExpenses: number;
  totalCommission: number;
  netRevenue: number;
  totalBookings: number;
  completedTrips: number;
  cancelledTrips: number;
  gstCollected: number;
}

export default function ReportsStats() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    fetch("/api/reports?report=dashboard")
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setSummary(result.data.summary);
        }
      })
      .catch(console.error);
  }, []);

  const stats = [
    {
      title: "Total Revenue",
      value: `₹${(summary?.totalRevenue ?? 0).toLocaleString("en-IN")}`,
    },
    {
      title: "Total Expenses",
      value: `₹${(summary?.totalExpenses ?? 0).toLocaleString("en-IN")}`,
    },
    {
      title: "Net Revenue",
      value: `₹${(summary?.netRevenue ?? 0).toLocaleString("en-IN")}`,
    },
    {
      title: "Total Bookings",
      value: (summary?.totalBookings ?? 0).toLocaleString("en-IN"),
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500">
            {item.title}
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900">
            {item.value}
          </h2>

          <div className="mt-4 text-sm text-slate-400">
            Live report data
          </div>
        </div>
      ))}
    </div>
  );
}
