"use client";

import { Vendor } from "../../data/vendors";

interface VendorRowProps {
  vendor: Vendor;
  onView?: (vendor: Vendor) => void;
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (vendor: Vendor) => void;
}

export default function VendorRow({
  vendor,
  onView,
  onEdit,
  onDelete,
}: VendorRowProps) {
  const statusClass =
    vendor.status === "Active"
      ? "bg-green-100 text-green-700"
      : (vendor.status as string) === "Suspended"
      ? "bg-orange-100 text-orange-700"
      : vendor.status === "Inactive"
      ? "bg-red-100 text-red-700"
      : "bg-yellow-100 text-yellow-700";

  return (
    <tr className="border-b transition hover:bg-slate-50">
      <td className="px-4 py-4 font-semibold whitespace-nowrap">
        {vendor.id}
      </td>

      <td className="px-4 py-4">
        <div className="font-semibold">
          {vendor.companyName}
        </div>

        <div className="text-sm text-slate-500">
          {vendor.ownerName}
        </div>
      </td>

      <td className="px-4 py-4 whitespace-nowrap">
        {vendor.mobile}
      </td>

      <td className="px-4 py-4">
        {vendor.city || "-"}
      </td>

      <td className="px-4 py-4 text-center">
        {vendor.totalVehicles}
      </td>

      <td className="px-4 py-4 text-center">
        {vendor.activeVehicles}
      </td>

      <td className="px-4 py-4 text-center">
        {vendor.completedTrips}
      </td>

      <td className="px-4 py-4 font-semibold whitespace-nowrap">
        {vendor.totalEarnings}
      </td>

      <td className="px-4 py-4 whitespace-nowrap">
        {vendor.pendingPayment}
      </td>

      <td className="px-4 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`}
        >
          {vendor.status}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onView?.(vendor)}
            className="rounded-lg border border-blue-500 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
          >
            View
          </button>

          <button
            type="button"
            onClick={() => onEdit?.(vendor)}
            className="rounded-lg bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(vendor)}
            className="rounded-lg bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}