"use client";

import { useEffect, useState } from "react";
import { Vendor } from "../../data/vendors";

interface Props {
  vendor: Vendor;
}

type Performance = {
  totalVehicles: number;
  activeVehicles: number;
  completedTrips: number;
  totalBookings: number;
  rating: number;
  totalReviews: number;
};

export default function VendorPerformanceCard({ vendor }: Props) {
  const [data, setData] = useState<Performance | null>(null);

  useEffect(() => {
    fetch(`/api/vendors/details?vendorId=${encodeURIComponent(vendor.id)}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setData(result.data.performance);
      })
      .catch(console.error);
  }, [vendor.id]);

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Performance</h3>

      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-slate-500">Completed Trips</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {data?.completedTrips ?? "—"}
          </h2>
        </div>

        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Rating</p>
          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {data ? `? ${data.rating}` : "—"}
          </h2>
        </div>

        <div className="rounded-xl bg-purple-50 p-5">
          <p className="text-sm text-slate-500">Fleet Size</p>
          <h2 className="mt-2 text-3xl font-bold text-purple-700">
            {data?.totalVehicles ?? "—"}
          </h2>
        </div>

        <div className="rounded-xl bg-orange-50 p-5">
          <p className="text-sm text-slate-500">Active Fleet</p>
          <h2 className="mt-2 text-3xl font-bold text-orange-700">
            {data?.activeVehicles ?? "—"}
          </h2>
        </div>
      </div>

      {data && (
        <div className="mt-5 text-sm text-slate-600">
          Total bookings: <strong>{data.totalBookings}</strong>
          {" · "}
          Reviews: <strong>{data.totalReviews}</strong>
        </div>
      )}
    </div>
  );
}