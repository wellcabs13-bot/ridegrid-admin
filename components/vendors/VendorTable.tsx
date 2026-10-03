"use client";

import { Vendor } from "../../data/vendors";
import VendorRow from "./VendorRow";

interface VendorTableProps {
  vendors: Vendor[];
  onView?: (vendor: Vendor) => void;
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (vendor: Vendor) => void;
}

export default function VendorTable({
  vendors,
  onView,
  onEdit,
  onDelete,
}: VendorTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left whitespace-nowrap">
                Vendor ID
              </th>
              <th className="px-4 py-3 text-left">
                Company
              </th>
              <th className="px-4 py-3 text-left">
                Mobile
              </th>
              <th className="px-4 py-3 text-left">
                City
              </th>
              <th className="px-4 py-3 text-center">
                Vehicles
              </th>
              <th className="px-4 py-3 text-center">
                Active
              </th>
              <th className="px-4 py-3 text-center">
                Trips
              </th>
              <th className="px-4 py-3 text-left">
                Earnings
              </th>
              <th className="px-4 py-3 text-left">
                Pending
              </th>
              <th className="px-4 py-3 text-left">
                Status
              </th>
              <th className="px-4 py-3 text-left">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {vendors.length > 0 ? (
              vendors.map((vendor) => (
                <VendorRow
                  key={vendor.id}
                  vendor={vendor}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={11}
                  className="px-6 py-12 text-center text-slate-500"
                >
                  No vendors found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}