"use client";

import { useEffect, useState } from "react";
import { Vendor } from "../../data/vendors";

interface Props {
  vendor: Vendor;
}

type Vehicle = {
  id: string;
  make: string;
  model: string;
  variant?: string | null;
  registrationNumber: string;
  category: string;
  status: string;
  rating: number;
  totalTrips: number;
  isVerified: boolean;
};

export default function VendorVehicleCard({ vendor }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/vendors/details?vendorId=${encodeURIComponent(vendor.id)}`)
      .then((r) => r.json())
      .then((result) => {
        if (result.success) setVehicles(result.data.vehicles ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [vendor.id]);

  const activeVehicles = vehicles.filter(
    (vehicle) => vehicle.status === "AVAILABLE"
  ).length;

  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Vehicle Summary</h3>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-slate-500">Total Vehicles</p>
          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {loading ? "—" : vehicles.length}
          </h2>
        </div>

        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Active Vehicles</p>
          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {loading ? "—" : activeVehicles}
          </h2>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        {loading ? (
          <p className="py-5 text-center text-sm text-slate-500">
            Loading vehicles...
          </p>
        ) : vehicles.length === 0 ? (
          <p className="py-5 text-center text-sm text-slate-500">
            No vehicles registered for this vendor.
          </p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left">Vehicle</th>
                <th className="px-3 py-2 text-left">Number</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id} className="border-b">
                  <td className="px-3 py-3">
                    {vehicle.make} {vehicle.model}
                    {vehicle.variant ? ` ${vehicle.variant}` : ""}
                  </td>
                  <td className="px-3 py-3">
                    {vehicle.registrationNumber}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">
                      {vehicle.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}