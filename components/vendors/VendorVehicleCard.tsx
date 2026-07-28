'use client';

import { Vendor } from '../../data/vendors';

interface VendorVehicleCardProps {
  vendor: Vendor;
}

export default function VendorVehicleCard({ vendor }: VendorVehicleCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Vehicle Summary</h3>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl bg-blue-50 p-5">
          <p className="text-sm text-slate-500">Total Vehicles</p>

          <h2 className="mt-2 text-3xl font-bold text-blue-700">
            {vendor.totalVehicles}
          </h2>
        </div>

        <div className="rounded-xl bg-green-50 p-5">
          <p className="text-sm text-slate-500">Active Vehicles</p>

          <h2 className="mt-2 text-3xl font-bold text-green-700">
            {vendor.activeVehicles}
          </h2>
        </div>
      </div>

      <div className="mt-6">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">Vehicle</th>

              <th className="px-3 py-2 text-left">Number</th>

              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {[
              ['Innova Crysta', 'MH12AB1234'],
              ['Ertiga', 'MH14XY4567'],
              ['Swift Dzire', 'MH13CD7788'],
            ].map((v, index) => (
              <tr key={index} className="border-b">
                <td className="px-3 py-3">{v[0]}</td>

                <td className="px-3 py-3">{v[1]}</td>

                <td className="px-3 py-3">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">
                    Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
