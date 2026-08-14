"use client";

import { Vehicle } from "../../data/vehicles";

interface VehicleRowProps {
  vehicle: Vehicle;
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
}

export default function VehicleRow({
  vehicle,
  onView,
  onEdit,
  onDelete,
}: VehicleRowProps) {
  const statusColor: Record<string, string> = {
    Available: "bg-green-100 text-green-700",
    "On Trip": "bg-blue-100 text-blue-700",
    Maintenance: "bg-orange-100 text-orange-700",
    Inactive: "bg-red-100 text-red-700",
  };

  const availabilityColor: Record<string, string> = {
    Available: "bg-green-100 text-green-700",
    Booked: "bg-indigo-100 text-indigo-700",
    Blocked: "bg-red-100 text-red-700",
  };

  return (
    <tr className="border-b transition hover:bg-slate-50">
      <td className="px-4 py-4 font-semibold">
        {vehicle.registrationNo}
      </td>

      <td className="px-4 py-4">
        <div className="font-semibold">
          {vehicle.vehicleName}
        </div>

        <div className="text-sm text-slate-500">
          {vehicle.brand} • {vehicle.model}
        </div>
      </td>

      <td className="px-4 py-4">
        {vehicle.vendorName || "-"}
      </td>

      <td className="px-4 py-4">
        {vehicle.driverName || "-"}
      </td>

      <td className="px-4 py-4">
        {vehicle.city || "-"}
      </td>

      <td className="px-4 py-4 text-center">
        {vehicle.totalTrips}
      </td>

      <td className="px-4 py-4 font-semibold text-green-600">
        {vehicle.earnings}
      </td>

      <td className="whitespace-nowrap px-4 py-4">
        {vehicle.insuranceExpiry || "-"}
      </td>

      <td className="px-4 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusColor[vehicle.status] ||
            "bg-slate-100 text-slate-700"
          }`}
        >
          {vehicle.status}
        </span>
      </td>

      <td className="px-4 py-4">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            availabilityColor[vehicle.availability] ||
            "bg-slate-100 text-slate-700"
          }`}
        >
          {vehicle.availability}
        </span>
      </td>

      <td className="px-4 py-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onView?.(vehicle)}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            View
          </button>

          <button
            type="button"
            onClick={() => onEdit?.(vehicle)}
            className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete?.(vehicle)}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}