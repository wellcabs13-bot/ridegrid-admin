"use client";

import { CarFront } from "lucide-react";
import { Pill } from "@/components/admin/kit";
import { Vehicle } from "../../data/vehicles";

interface VehicleRowProps {
  vehicle: Vehicle;
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
  onVerify?: (vehicle: Vehicle) => void;
  isVerified?: boolean;
}

const STATUS_PILL: Record<string, string> = {
  Available: "ACTIVE",
  "On Trip": "TRIP_STARTED",
  Maintenance: "PENDING",
  Inactive: "INACTIVE",
};

export default function VehicleRow({
  vehicle,
  onView,
  onEdit,
  onDelete,
  onVerify,
  isVerified = false,
}: VehicleRowProps) {
  return (
    <tr className="cursor-pointer" onClick={() => onView?.(vehicle)}>
      <td>
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
            <CarFront size={18} />
          </span>

          <div className="min-w-0">
            <p className="font-semibold">{vehicle.registrationNo}</p>

            <p className="truncate text-xs text-neutral-500">
              {vehicle.brand} {vehicle.model}
            </p>
          </div>
        </div>
      </td>

      <td className="text-[13px]">{vehicle.category || "-"}</td>

      <td>{vehicle.vendorName || "-"}</td>

      <td>{vehicle.driverName || "-"}</td>

      <td>{vehicle.city || "-"}</td>

      <td className="text-right">{vehicle.totalTrips}</td>

      <td>
        <Pill
          value={STATUS_PILL[vehicle.status] ?? "PENDING"}
          label={vehicle.status}
        />
      </td>

      <td>
        {isVerified ? (
          <Pill value="VERIFIED" label="Verified" />
        ) : (
          <Pill value="UNVERIFIED" label="Not verified" />
        )}
      </td>

      <td>
        <div
          className="flex flex-wrap items-center justify-end gap-2"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => onView?.(vehicle)} className="rg-outline">
            View
          </button>

          <button
            type="button"
            onClick={() => onEdit?.(vehicle)}
            className="rg-secondary !px-3 !py-1 !text-xs"
          >
            Edit
          </button>

          {!isVerified && (
            <button
              type="button"
              onClick={() => onVerify?.(vehicle)}
              className="rg-secondary !px-3 !py-1 !text-xs"
            >
              Verify
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete?.(vehicle)}
            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
